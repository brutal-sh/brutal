import { downloadBlob } from '@/app/document/io/browser'
import { DEFAULT_DOCUMENT_EXTENSION } from '@/app/document/io/names'
import { IS_TAURI } from '@/constants'

import { saveDocumentAs } from './destination'
import { buildVersionedFile } from './encode'
import { documentSaveFormat, documentSaveMime, type DocumentSaveFormat } from './format'
import type { SaveContext } from './types'

function currentFormat(context: SaveContext): DocumentSaveFormat {
  if (context.getStorageBinding()) return 'fig'
  return documentSaveFormat(
    context.getFileHandle()?.name ??
      context.getDownloadName() ??
      context.getFilePath() ??
      `Untitled${DEFAULT_DOCUMENT_EXTENSION}`
  )
}

async function saveWritableDocument(
  context: SaveContext,
  format: DocumentSaveFormat,
  beforeWrite?: () => void
) {
  const filePath = context.getFilePath()
  const fileHandle = context.getFileHandle()
  const storageBinding = context.getStorageBinding()
  const { data, version } = await buildVersionedFile(context, format)
  beforeWrite?.()
  const wrote = await context.writeFile(data, version, format)
  if (
    wrote &&
    !storageBinding &&
    context.getFileHandle() === fileHandle &&
    context.getFilePath() === filePath
  )
    context.setSourceIdentity({ handle: fileHandle, path: filePath })
  return wrote
}

export async function saveCurrentDocument(context: SaveContext, beforeWrite?: () => void) {
  beforeWrite?.()
  const downloadName = context.getDownloadName()
  const format = currentFormat(context)
  if (context.hasWritableSource()) return saveWritableDocument(context, format, beforeWrite)
  if (downloadName && !IS_TAURI) {
    const { data, version } = await buildVersionedFile(context, format)
    beforeWrite?.()
    downloadBlob(new Uint8Array(data), downloadName, documentSaveMime(format))
    await context.onDownloadSuccess?.(version)
    return true
  }
  if (beforeWrite) throw new Error('The document no longer has a writable source')
  return saveDocumentAs(context)
}
