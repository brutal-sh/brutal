import {
  documentNameFromFigPath,
  downloadNameFromPath,
  documentDownloadName
} from '@/app/document/io/names'
import type { SourceContext } from '@/app/document/io/source/types'
import type { StorageDocumentBinding } from '@/app/integrations/storage/types'
import { trackDocumentFormat } from '@/app/telemetry'

interface FileSource {
  fileName: string
  sourceFormat: string
  handle?: FileSystemFileHandle
  path?: string
}

function markDocumentSaved(context: SourceContext) {
  context.changes.markSaved()
  context.options.setSavedVersion(context.changes.capture())
}

function renameDocument(context: SourceContext, name: string) {
  const { state, getStorageBinding } = context.options
  const trimmed = name.trim()
  if (state.readOnly || !trimmed || trimmed === state.documentName) return
  state.documentName = trimmed
  // Storage keeps the name with the document; a file's name is its path.
  if (getStorageBinding()) context.changes.markChanged()
}

function isWritableFormat(format: string) {
  return format === 'fig' || format === 'pen'
}

function setDocumentSource(
  context: SourceContext,
  { fileName, sourceFormat, handle, path }: FileSource
) {
  const {
    stopWatchingFile,
    setStorageBinding,
    setFileHandle,
    setFilePath,
    setDownloadName,
    setSourceIdentity,
    startWatchingFile
  } = context.options
  stopWatchingFile()
  setStorageBinding(null)
  const writable = isWritableFormat(sourceFormat)
  setFileHandle(writable ? (handle ?? null) : null)
  setFilePath(writable ? (path ?? null) : null)
  setDownloadName(documentDownloadName(fileName, sourceFormat))
  setSourceIdentity({ handle: handle ?? null, path: path ?? null })
  markDocumentSaved(context)
  void context.recovery.markProtectedVersion(context.changes.capture())
  trackDocumentFormat('document_opened', sourceFormat)
  if (writable && (handle || path)) void startWatchingFile()
}

function setStorageDocumentSource(
  context: SourceContext,
  binding: StorageDocumentBinding,
  documentName: string
) {
  const {
    stopWatchingFile,
    setFileHandle,
    setFilePath,
    setDownloadName,
    setSourceIdentity,
    setStorageBinding,
    state
  } = context.options
  stopWatchingFile()
  setFileHandle(null)
  setFilePath(null)
  setDownloadName(`${documentName}.fig`)
  setSourceIdentity({ handle: null, path: null })
  setStorageBinding(binding)
  state.documentName = documentName
  state.autosaveEnabled = true
  markDocumentSaved(context)
  void context.recovery.markProtectedVersion(context.changes.capture())
}

export function setPlannedFilePath(context: SourceContext, path: string) {
  const {
    stopWatchingFile,
    setStorageBinding,
    setFileHandle,
    setFilePath,
    setDownloadName,
    state
  } = context.options
  stopWatchingFile()
  setStorageBinding(null)
  setFileHandle(null)
  setFilePath(path)
  const downloadName = downloadNameFromPath(path)
  setDownloadName(downloadName)
  state.documentName = documentNameFromFigPath(downloadName)
}

export function createSourceIdentityActions(context: SourceContext) {
  return {
    renameDocument: (name: string) => renameDocument(context, name),
    setDocumentSource: (
      fileName: string,
      sourceFormat: string,
      handle?: FileSystemFileHandle,
      path?: string
    ) => setDocumentSource(context, { fileName, sourceFormat, handle, path }),
    setStorageDocumentSource: (binding: StorageDocumentBinding, documentName: string) =>
      setStorageDocumentSource(context, binding, documentName),
    setPlannedFilePath: (path: string) => setPlannedFilePath(context, path),
    markDocumentSaved: () => markDocumentSaved(context),
    startWatchingCurrentFile: () => {
      void context.options.startWatchingFile()
    }
  }
}
