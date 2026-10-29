import type { EditorState } from '@open-pencil/core'
import { filesMessages } from '@open-pencil/vue/i18n'

import { downloadBlob } from '@/app/document/io/browser'
import { isFileWriteRefused } from '@/app/document/io/capability'
import { documentNameFromFigPath, downloadNameFromPath } from '@/app/document/io/names'
import {
  documentSaveFormat,
  documentSaveMime,
  type DocumentSaveFormat
} from '@/app/document/io/save/format'
import {
  chooseBrowserDocumentSaveHandle,
  chooseTauriDocumentSavePath
} from '@/app/document/io/save/targets'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentWriter } from '@/app/document/io/write'
import { IS_TAURI } from '@/constants'

type SaveDocumentState = EditorState & { documentName: string }

type SaveActionsOptions = Omit<DocumentSourceAccess, 'getSavedVersion'> & {
  state: SaveDocumentState
  /** The document's content revision, recorded as the saved version. */
  version: () => number
  buildFigFile: () => Uint8Array | Promise<Uint8Array>
  buildPenFile?: () => Uint8Array | Promise<Uint8Array>
  startWatchingFile: () => void
  onWriteSuccess?: (version: number) => void | Promise<void>
  onDownloadSuccess?: (version: number) => void | Promise<void>
}

export function createSaveActions({
  state,
  version: currentVersion,
  buildFigFile,
  buildPenFile,
  getFilePath,
  setFilePath,
  getFileHandle,
  setFileHandle,
  getDownloadName,
  setDownloadName,
  getStorageBinding,
  setStorageBinding,
  hasWritableSource,
  setSourceIdentity,
  setSavedVersion,
  setLastWriteTime,
  startWatchingFile,
  onWriteSuccess,
  onDownloadSuccess
}: SaveActionsOptions) {
  const writeFile = createDocumentWriter({
    state,
    getFilePath,
    getFileHandle,
    getStorageBinding,
    setSavedVersion,
    setLastWriteTime,
    onWriteSuccess
  })

  async function buildVersionedFile(format: DocumentSaveFormat) {
    const version = currentVersion()
    const build = format === 'pen' ? buildPenFile : buildFigFile
    if (!build) throw new Error('This document cannot be saved as .pen. Choose .fig instead.')
    return { data: await build(), version }
  }

  function currentFormat(): DocumentSaveFormat {
    if (getStorageBinding()) return 'fig'
    return documentSaveFormat(
      getFileHandle()?.name ?? getDownloadName() ?? getFilePath() ?? 'Untitled.fig'
    )
  }

  async function saveFigFile() {
    const filePath = getFilePath()
    const fileHandle = getFileHandle()
    const storageBinding = getStorageBinding()
    const downloadName = getDownloadName()
    const format = currentFormat()
    if (hasWritableSource()) {
      const { data, version } = await buildVersionedFile(format)
      const wrote = await writeFile(data, version, format)
      if (wrote && !storageBinding && getFileHandle() === fileHandle && getFilePath() === filePath)
        setSourceIdentity({ handle: fileHandle, path: filePath })
      return wrote
    }
    if (downloadName) {
      const { data, version } = await buildVersionedFile(format)
      downloadBlob(new Uint8Array(data), downloadName, documentSaveMime(format))
      await onDownloadSuccess?.(version)
      return true
    }
    return saveFigFileAs()
  }

  async function saveFigFileAs() {
    const previous = {
      path: getFilePath(),
      handle: getFileHandle(),
      storage: getStorageBinding(),
      name: state.documentName,
      downloadName: getDownloadName()
    }
    try {
      const saved = await saveAs()
      if (saved) return true
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        restore()
        throw error
      }
    }
    restore()
    return false

    function restore() {
      setFilePath(previous.path)
      setFileHandle(previous.handle)
      setStorageBinding(previous.storage)
      setDownloadName(previous.downloadName)
      state.documentName = previous.name
      if (previous.path || previous.handle) startWatchingFile()
    }
  }

  async function saveAs() {
    const suggestedName = getDownloadName() ?? `${state.documentName || 'Untitled'}.fig`
    if (IS_TAURI) {
      const path = await chooseTauriDocumentSavePath(suggestedName)
      if (!path) return false
      const format = documentSaveFormat(path)
      const { data, version } = await buildVersionedFile(format)
      setStorageBinding(null)
      setFilePath(path)
      setFileHandle(null)
      state.documentName = documentNameFromFigPath(path)
      const wrote = await writeFile(data, version, format)
      if (wrote) {
        setDownloadName(downloadNameFromPath(path))
        setSourceIdentity({ handle: null, path })
        startWatchingFile()
      }
      return wrote
    }

    const handle = await chooseBrowserDocumentSaveHandle(suggestedName)
    if (handle) {
      const format = documentSaveFormat(handle.name)
      const { data, version } = await buildVersionedFile(format)
      setStorageBinding(null)
      setFileHandle(handle)
      setFilePath(null)
      state.documentName = documentNameFromFigPath(handle.name)
      try {
        const wrote = await writeFile(data, version, format)
        if (wrote) {
          setDownloadName(handle.name)
          setSourceIdentity({ handle, path: null })
          startWatchingFile()
        }
        return wrote
      } catch (error) {
        if (!isFileWriteRefused(error)) throw error
        return downloadAs(handle.name, data, version, format)
      }
    }

    const filename = prompt(`${filesMessages.get().saveAsPrompt} (.fig or .pen)`, suggestedName)
    if (!filename) return false
    const format = documentSaveFormat(filename)
    const { data, version } = await buildVersionedFile(format)
    return downloadAs(filename, data, version, format)
  }

  async function downloadAs(
    filename: string,
    data: Uint8Array,
    version: number,
    format: DocumentSaveFormat
  ) {
    // A download has no writable file identity, even after a picker refused a local write.
    downloadBlob(new Uint8Array(data), filename, documentSaveMime(format))
    setStorageBinding(null)
    setFilePath(null)
    setFileHandle(null)
    setSourceIdentity({ handle: null, path: null })
    setDownloadName(filename)
    state.documentName = documentNameFromFigPath(filename)
    await onDownloadSuccess?.(version)
    return true
  }

  return { saveFigFile, saveFigFileAs, writeFile }
}
