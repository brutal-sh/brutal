import { extname } from 'pathe'

import { pickBrowserSaveFile } from '@/app/document/io/capability'
import { DEFAULT_DOCUMENT_EXTENSION } from '@/app/document/io/names'
import { notificationMessages } from '@/app/i18n/notifications'

const saveTypes = [
  { extension: DEFAULT_DOCUMENT_EXTENSION, name: 'Brutal document', mime: 'application/json' },
  { extension: '.pen', name: 'Pencil document', mime: 'application/json' },
  { extension: '.fig', name: 'Figma file', mime: 'application/octet-stream' }
]

function orderedSaveTypes(suggestedName: string) {
  const extension = extname(suggestedName).toLowerCase()
  const preferred = saveTypes.find((type) => type.extension === extension) ?? saveTypes[0]
  return [preferred, ...saveTypes.filter((type) => type !== preferred)]
}

export async function chooseTauriDocumentSavePath(
  suggestedName = `Untitled${DEFAULT_DOCUMENT_EXTENSION}`
) {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const types = orderedSaveTypes(suggestedName)
  return save({
    title: notificationMessages.get().nativeSaveTitle({ extension: types[0].extension }),
    defaultPath: suggestedName,
    filters: types.map(({ name, extension }) => ({ name, extensions: [extension.slice(1)] }))
  })
}

/** Null means no picker; cancellation rejects with AbortError so it never opens a second prompt. */
export function chooseBrowserDocumentSaveHandle(
  suggestedName = `Untitled${DEFAULT_DOCUMENT_EXTENSION}`
) {
  const types = orderedSaveTypes(suggestedName).map(({ name, mime, extension }) => ({
    description: name,
    accept: { [mime]: [extension] }
  }))
  return pickBrowserSaveFile({ suggestedName, types })
}
