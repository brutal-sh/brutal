import {
  DEFAULT_DOCUMENT_EXTENSION,
  documentNameFromFigPath,
  downloadNameFromPath,
  documentDownloadName
} from '@/app/document/io/names'
import { validateRecoveryFileSource } from '@/app/document/io/source/recovery'
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
    setSourceIdentity
  } = context.options
  context.nativeSource.clear()
  context.fileWatch.reset()
  stopWatchingFile()
  setStorageBinding(null)
  const writable = isWritableFormat(sourceFormat)
  setFileHandle(writable ? (handle ?? null) : null)
  setFilePath(writable ? (path ?? null) : null)
  setDownloadName(documentDownloadName(fileName, sourceFormat))
  setSourceIdentity({ handle: handle ?? null, path: path ?? null })
  markDocumentSaved(context)
  void context.recovery.markProtectedVersion(context.changes.capture())
  const usageFormat =
    sourceFormat === 'pen' && fileName.toLowerCase().endsWith(DEFAULT_DOCUMENT_EXTENSION)
      ? 'brut'
      : sourceFormat
  trackDocumentFormat('document_opened', usageFormat)
  if (writable && (handle || path)) void context.fileWatch.start()
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
  context.nativeSource.clear()
  context.fileWatch.reset()
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

export function restoreRecoverySource(context: SourceContext, input: unknown) {
  const source = validateRecoveryFileSource(input)
  const options = context.options
  context.fileWatch.defer()
  options.setStorageBinding(null)
  options.setFileHandle(source.identity.handle)
  options.setFilePath(source.identity.path)
  options.setDownloadName(source.fileName)
  options.setSourceIdentity(source.identity)
  context.nativeSource.restore(source.identity.path, source.nativeHash)
  // Restoring unsaved edits must not write them back before an explicit save.
  options.state.autosaveEnabled = false
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
    setNativeSourceVersion: context.nativeSource.associate,
    startWatchingCurrentFile: () => {
      void context.fileWatch.start()
    }
  }
}
