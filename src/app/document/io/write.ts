import { describeDiagnosticError, recordDocumentFailure } from '@/app/diagnostics'
import type { DocumentSaveFormat } from '@/app/document/io/save/format'
import { NativeSavePermissionError, writeLocalDocument } from '@/app/document/io/save/local'
import { storageLocationOf } from '@/app/integrations/storage/location'
import type { StorageDocumentBinding } from '@/app/integrations/storage/types'
import { persistStorageCanvasLocally } from '@/app/storage/sync/persist'

type WriteDocumentState = { documentName: string }

type DocumentWriterOptions = {
  state: WriteDocumentState
  getFilePath: () => string | null
  getFileHandle: () => FileSystemFileHandle | null
  getStorageBinding: () => StorageDocumentBinding | null
  setSavedVersion: (version: number) => void
  setLastWriteTime: (time: number) => void
  onWriteSuccess?: (version: number) => void | Promise<void>
}

export function createDocumentWriter({
  state,
  getFilePath,
  getFileHandle,
  getStorageBinding,
  setSavedVersion,
  setLastWriteTime,
  onWriteSuccess
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
    setLastWriteTime(Date.now())
    try {
      const storage = getStorageBinding()
      if (storage) {
        if (format !== 'fig') throw new Error('Storage documents must use FIG encoding.')
        await persistStorageCanvasLocally({
          ...storageLocationOf(storage),
          canvasId: storage.documentId,
          name: state.documentName || 'Untitled',
          figBytes: data
        })
        return await finishWrite(version)
      }

      const wrote = await writeLocalDocument(getFilePath(), getFileHandle(), data, format)
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
