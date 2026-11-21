import { filesMessages } from '@open-pencil/vue/i18n'

import { downloadBlob } from '@/app/document/io/browser'
import { isFileWriteRefused } from '@/app/document/io/capability'
import {
  DEFAULT_DOCUMENT_EXTENSION,
  documentNameFromFigPath,
  downloadNameFromPath
} from '@/app/document/io/names'
import { IS_TAURI } from '@/constants'

import { buildVersionedFile } from './encode'
import { documentSaveFormat, documentSaveMime } from './format'
import { chooseBrowserDocumentSaveHandle, chooseTauriDocumentSavePath } from './targets'
import type { SaveContext, VersionedFile } from './types'

export async function saveDocumentAs(context: SaveContext) {
  const previous = {
    path: context.getFilePath(),
    handle: context.getFileHandle(),
    storage: context.getStorageBinding(),
    name: context.state.documentName,
    downloadName: context.getDownloadName()
  }
  try {
    const saved = await saveAs(context)
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
    context.setFilePath(previous.path)
    context.setFileHandle(previous.handle)
    context.setStorageBinding(previous.storage)
    context.setDownloadName(previous.downloadName)
    context.state.documentName = previous.name
    if (previous.path || previous.handle) context.startWatchingFile()
  }
}

async function saveAs(context: SaveContext) {
  const suggestedName =
    context.getDownloadName() ??
    `${context.state.documentName || 'Untitled'}${DEFAULT_DOCUMENT_EXTENSION}`
  if (IS_TAURI) return saveNativeAs(context, suggestedName)
  const handle = await chooseBrowserDocumentSaveHandle(suggestedName)
  if (handle) return saveBrowserAs(context, handle)
  const filename = prompt(
    `${filesMessages.get().saveAsPrompt} (.brut, .pen, or .fig)`,
    suggestedName
  )
  if (!filename) return false
  return downloadAs(
    context,
    filename,
    await buildVersionedFile(context, documentSaveFormat(filename))
  )
}

async function saveNativeAs(context: SaveContext, suggestedName: string) {
  const path = await chooseTauriDocumentSavePath(suggestedName)
  if (!path) return false
  const format = documentSaveFormat(path)
  const { data, version } = await buildVersionedFile(context, format)
  context.setStorageBinding(null)
  context.setFilePath(path)
  context.setFileHandle(null)
  context.state.documentName = documentNameFromFigPath(path)
  const wrote = await context.writeFile(data, version, format)
  if (wrote) {
    context.setDownloadName(downloadNameFromPath(path))
    context.setSourceIdentity({ handle: null, path })
    context.startWatchingFile()
  }
  return wrote
}

async function saveBrowserAs(context: SaveContext, handle: FileSystemFileHandle) {
  const file = await buildVersionedFile(context, documentSaveFormat(handle.name))
  context.setStorageBinding(null)
  context.setFileHandle(handle)
  context.setFilePath(null)
  context.state.documentName = documentNameFromFigPath(handle.name)
  try {
    const wrote = await context.writeFile(file.data, file.version, file.format)
    if (wrote) {
      context.setDownloadName(handle.name)
      context.setSourceIdentity({ handle, path: null })
      context.startWatchingFile()
    }
    return wrote
  } catch (error) {
    if (!isFileWriteRefused(error)) throw error
    return downloadAs(context, handle.name, file)
  }
}

async function downloadAs(context: SaveContext, filename: string, file: VersionedFile) {
  // A download has no writable file identity, even after a picker refused a local write.
  downloadBlob(new Uint8Array(file.data), filename, documentSaveMime(file.format))
  context.setStorageBinding(null)
  context.setFilePath(null)
  context.setFileHandle(null)
  context.setSourceIdentity({ handle: null, path: null })
  context.setDownloadName(filename)
  context.state.documentName = documentNameFromFigPath(filename)
  await context.onDownloadSuccess?.(file.version)
  return true
}
