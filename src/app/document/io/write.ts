import { describeDiagnosticError, recordDocumentFailure } from '@/app/diagnostics'
import type { DocumentSaveFormat } from '@/app/document/io/save/format'
import { NativeSavePermissionError, writeLocalDocument } from '@/app/document/io/save/local'
import type { createNativeSource } from '@/app/document/io/source/native'
import { storageLocationOf } from '@/app/integrations/storage/location'
import type { StorageDocumentBinding } from '@/app/integrations/storage/types'
import { persistStorageCanvasLocally } from '@/app/storage/sync/persist'
import { isTauri } from '@/app/tauri/env'

type WriteDocumentState = { documentName: string }

type DocumentWriterOptions = {
  state: WriteDocumentState
  getFilePath: () => string | null
  getFileHandle: () => FileSystemFileHandle | null
  getStorageBinding: () => StorageDocumentBinding | null
  setSavedVersion: (version: number) => void
  setLastWriteTime: (time: number) => void
  onWriteSuccess?: (version: number) => void | Promise<void>
  nativeSource?: ReturnType<typeof createNativeSource>
}

export function createDocumentWriter({
  state,
  getFilePath,
  getFileHandle,
  getStorageBinding,
  setSavedVersion,
  setLastWriteTime,
  onWriteSuccess,
  nativeSource
}: DocumentWriterOptions) {
  async function finishWrite(version: number): Promise<true> {
    setSavedVersion(version)
    try {
      await onWriteSuccess?.(version)
    } catch (error) {
      console.warn('[Recovery] Cleanup after document write failed:', error)
    }
    return true
  }

  return async function writeFile(
    data: Uint8Array,
    version: number,
    format: DocumentSaveFormat = 'fig'
  ): Promise<boolean> {
    try {
      const storage = getStorageBinding()
      if (storage) {
        setLastWriteTime(Date.now())
        if (format !== 'fig') throw new Error('Storage documents must use FIG encoding.')
        await persistStorageCanvasLocally({
          ...storageLocationOf(storage),
          canvasId: storage.documentId,
          name: state.documentName || 'Untitled',
          figBytes: data
        })
        return await finishWrite(version)
      }

      const path = getFilePath()
      const handle = getFileHandle()
      const hash =
        path && nativeSource && isTauri() ? await nativeSource.prepareWrite(path, data) : undefined
      if (path !== getFilePath() || handle !== getFileHandle() || storage !== getStorageBinding())
        throw new Error('The save destination changed. Save again to use the new destination.')
      setLastWriteTime(Date.now())
      const wrote = await writeLocalDocument(path, handle, data, format)
      if (wrote && path && hash && path === getFilePath()) nativeSource?.associate(path, hash)
      return wrote ? await finishWrite(version) : false
    } catch (error) {
      const failure = error instanceof NativeSavePermissionError ? error.cause : error
      recordDocumentFailure({
        operation: 'save',
        format,
        ...describeDiagnosticError(failure)
      })
      throw error
    }
  }
}
