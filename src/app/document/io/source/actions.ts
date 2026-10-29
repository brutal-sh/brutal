import type { Editor, EditorState } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'
import { exportFigFile } from '@open-pencil/core/io/formats/fig'

import { createAutosave } from '@/app/document/autosave'
import { createDocumentChanges } from '@/app/document/io/changes'
import {
  documentNameFromFigPath,
  downloadNameFromPath,
  documentDownloadName
} from '@/app/document/io/names'
import { createSaveActions } from '@/app/document/io/save/actions'
import { documentSaveFormat } from '@/app/document/io/save/format'
import { createDocumentSourceState } from '@/app/document/io/source/state'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentRecovery } from '@/app/document/recovery'
import { recoveryEnabled } from '@/app/document/recovery/preferences'
import { notificationMessages } from '@/app/i18n/notifications'
import { storageLocationOf } from '@/app/integrations/storage/location'
import type { StorageDocumentBinding, StorageLocation } from '@/app/integrations/storage/types'
import { toast } from '@/app/shell/ui'
import { createCanvasId } from '@/app/storage/id'
import { isTauri } from '@/app/tauri/env'
import { trackDocumentFormat } from '@/app/telemetry'

type DocumentSourceState = EditorState & {
  documentName: string
  autosaveEnabled: boolean
}

export { createDocumentSourceState }

type DocumentSourceOptions = DocumentSourceAccess & {
  io: IORegistry
  editor: Editor
  state: DocumentSourceState
  stopWatchingFile: () => void
  startWatchingFile: () => Promise<void>
  getRenderer: () => Editor['renderer']
}

export function createDocumentSourceActions({
  io,
  editor,
  state,
  stopWatchingFile,
  startWatchingFile,
  getFileHandle,
  setFileHandle,
  getFilePath,
  setFilePath,
  getDownloadName,
  setDownloadName,
  getStorageBinding,
  setStorageBinding,
  hasWritableSource,
  setSourceIdentity,
  getSavedVersion,
  setSavedVersion,
  setLastWriteTime,
  getRenderer
}: DocumentSourceOptions) {
  const changes = createDocumentChanges(editor)
  let pendingSave: Promise<boolean> | null = null
  let disposed = false

  /** Keep target selection, encoding, writing and saved-state updates in one transaction. */
  function serializeSave(operation: () => Promise<boolean>): Promise<boolean> {
    const run = () => (disposed ? Promise.resolve(false) : operation())
    // Start an idle save immediately, preserving the file picker's user activation.
    const result = pendingSave ? pendingSave.then(run, run) : run()
    pendingSave = result
    const settled = () => {
      if (pendingSave === result) pendingSave = null
    }
    void result.then(settled, settled)
    return result
  }

  async function saveAndTrack(save: () => Promise<boolean>) {
    const revision = changes.capture()
    const saved = await save()
    if (saved) changes.markSaved(revision)
    return saved
  }

  function buildFigFile() {
    const renderer = getRenderer()
    return exportFigFile(editor.graph, {
      ck: renderer?.ck,
      renderer: renderer ?? undefined,
      pageId: state.currentPageId,
      documentName: state.documentName
    })
  }

  async function buildPenFile() {
    const result = await io.writeDocument('pen', editor.graph)
    return typeof result.data === 'string' ? new TextEncoder().encode(result.data) : result.data
  }

  async function saveUserDocument(save: () => Promise<boolean>) {
    try {
      return await saveAndTrack(save)
    } catch (error) {
      toast.error(
        notificationMessages
          .get()
          .operationFailed({ error: error instanceof Error ? error.message : String(error) })
      )
      return false
    }
  }

  function buildRecoveryFigFile() {
    return exportFigFile(editor.graph, {
      pageId: state.currentPageId,
      documentName: state.documentName
    })
  }

  const recovery = createDocumentRecovery({
    state,
    version: changes.capture,
    isEnabled: () => recoveryEnabled.value,
    buildFigFile: buildRecoveryFigFile,
    hasWritableSource
  })

  const { saveFigFile, saveFigFileAs } = createSaveActions({
    state,
    version: changes.capture,
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
    startWatchingFile: () => {
      void startWatchingFile()
    },
    onWriteSuccess: (version) => recovery.markProtectedVersion(version),
    onDownloadSuccess: (version) => recovery.markProtectedVersion(version)
  })

  const autosave = createAutosave({
    state,
    version: changes.capture,
    getSavedVersion,
    hasWritableSource,
    saveCurrentDocument: async () => {
      await serializeSave(() => saveAndTrack(saveFigFile))
    }
  })

  function markDocumentSaved() {
    changes.markSaved()
    setSavedVersion(changes.capture())
  }

  function renameDocument(name: string) {
    const trimmed = name.trim()
    if (state.readOnly || !trimmed || trimmed === state.documentName) return
    state.documentName = trimmed
    // Storage keeps the name with the document; a file's name is its path, which saving leaves as is.
    if (getStorageBinding()) changes.markChanged()
  }

  function setDocumentSource(
    fileName: string,
    sourceFormat: string,
    handle?: FileSystemFileHandle,
    path?: string
  ) {
    stopWatchingFile()
    setStorageBinding(null)
    const writable = sourceFormat === 'fig' || sourceFormat === 'pen'
    setFileHandle(writable ? (handle ?? null) : null)
    setFilePath(writable ? (path ?? null) : null)
    setDownloadName(documentDownloadName(fileName, sourceFormat))
    setSourceIdentity({ handle: handle ?? null, path: path ?? null })
    markDocumentSaved()
    void recovery.markProtectedVersion(changes.capture())
    trackDocumentFormat('document_opened', sourceFormat)
    if (writable && (handle || path)) {
      void startWatchingFile()
    }
  }

  function setStorageDocumentSource(binding: StorageDocumentBinding, documentName: string) {
    stopWatchingFile()
    setFileHandle(null)
    setFilePath(null)
    setDownloadName(`${documentName}.fig`)
    setSourceIdentity({ handle: null, path: null })
    setStorageBinding(binding)
    state.documentName = documentName
    state.autosaveEnabled = true
    markDocumentSaved()
    void recovery.markProtectedVersion(changes.capture())
  }

  function setPlannedFilePath(path: string) {
    stopWatchingFile()
    setStorageBinding(null)
    setFileHandle(null)
    setFilePath(path)
    const downloadName = downloadNameFromPath(path)
    setDownloadName(downloadName)
    state.documentName = documentNameFromFigPath(downloadName)
  }

  /** Called inside the shared save queue, so rollback cannot restore another save's target. */
  async function saveToNewTarget(planTarget: () => void): Promise<boolean> {
    const previous = {
      filePath: getFilePath(),
      fileHandle: getFileHandle(),
      storageBinding: getStorageBinding(),
      downloadName: getDownloadName(),
      documentName: state.documentName
    }
    const restore = () => {
      setStorageBinding(previous.storageBinding)
      setFileHandle(previous.fileHandle)
      setFilePath(previous.filePath)
      setDownloadName(previous.downloadName)
      state.documentName = previous.documentName
      if (previous.filePath || previous.fileHandle) void startWatchingFile()
    }
    planTarget()
    try {
      const saved = await saveAndTrack(saveFigFile)
      if (!saved) restore()
      return saved
    } catch (error) {
      restore()
      throw error
    }
  }

  async function saveFigFileToPath(path: string): Promise<boolean> {
    // Only the desktop app writes paths; a browser would fall back to a download.
    if (!isTauri()) return false
    const saved = await saveToNewTarget(() => setPlannedFilePath(path))
    if (saved) void startWatchingFile()
    return saved
  }

  /**
   * Hand the document to `write`, such as an MCP server saving it to a path a browser cannot
   * reach, and count it saved as a download is. Where the document saves next does not change.
   */
  async function saveFigFileCopy(
    write: (data: Uint8Array) => Promise<void>,
    fileName = 'Untitled.fig'
  ): Promise<boolean> {
    const version = changes.capture()
    await write(await (documentSaveFormat(fileName) === 'pen' ? buildPenFile() : buildFigFile()))
    await recovery.markProtectedVersion(version)
    return true
  }

  /** Upload the document to storage as a new stored document and keep editing it there. */
  async function saveFigFileToStorage(location: StorageLocation): Promise<boolean> {
    const saved = await saveToNewTarget(() => {
      stopWatchingFile()
      setFileHandle(null)
      setFilePath(null)
      setDownloadName(`${state.documentName}.fig`)
      setStorageBinding({ ...storageLocationOf(location), documentId: createCanvasId() })
    })
    if (saved) {
      setSourceIdentity({ handle: null, path: null })
      state.autosaveEnabled = true
    }
    return saved
  }

  function startWatchingCurrentFile() {
    void startWatchingFile()
  }

  function disposeDocumentIO() {
    disposed = true
    changes.dispose()
    stopWatchingFile()
    autosave.disposeAutosave()
    recovery.disposeRecovery()
  }

  return {
    renameDocument,
    setDocumentSource,
    setStorageDocumentSource,
    setPlannedFilePath,
    saveFigFileToPath: (path: string) => serializeSave(() => saveFigFileToPath(path)),
    saveFigFileCopy: (write: (data: Uint8Array) => Promise<void>, fileName?: string) =>
      serializeSave(() => saveAndTrack(() => saveFigFileCopy(write, fileName))),
    saveFigFileToStorage: (location: StorageLocation) =>
      serializeSave(() => saveFigFileToStorage(location)),
    startWatchingCurrentFile,
    disposeDocumentIO,
    saveFigFile: () => serializeSave(() => saveUserDocument(saveFigFile)),
    saveFigFileAs: () => serializeSave(() => saveUserDocument(saveFigFileAs)),
    hasUnsavedChanges: changes.hasUnsavedChanges,
    markDocumentSaved,
    markDocumentChanged: changes.markChanged,
    adoptChanges: changes.adopt,
    getStorageBinding,
    getRecoveryId: () => recovery.getRecoveryId(),
    adoptRecoverySnapshot: (id: string) => {
      changes.markChanged()
      return recovery.adoptRecoverySnapshot(id)
    },
    persistRecoveryNow: () => recovery.persistNow(),
    discardRecovery: () => recovery.discardRecovery()
  }
}
