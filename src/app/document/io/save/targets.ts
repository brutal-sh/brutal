import { pickBrowserSaveFile } from '@/app/document/io/capability'
import { notificationMessages } from '@/app/i18n/notifications'

export async function chooseTauriDocumentSavePath(suggestedName = 'Untitled.pen') {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const filters = [
    { name: 'Pen file', extensions: ['pen'] },
    { name: 'Figma file', extensions: ['fig'] }
  ]
  const isFig = suggestedName.toLowerCase().endsWith('.fig')
  if (isFig) filters.reverse()
  return save({
    title: notificationMessages.get().nativeSaveTitle({ extension: isFig ? '.fig' : '.pen' }),
    defaultPath: suggestedName,
    filters
  })
}

/** Null means no picker; cancellation rejects with AbortError so it never opens a second prompt. */
export function chooseBrowserDocumentSaveHandle(suggestedName = 'Untitled.pen') {
  const types: FilePickerAcceptType[] = [
    { description: 'Pen file', accept: { 'application/json': ['.pen'] } },
    { description: 'Figma file', accept: { 'application/octet-stream': ['.fig'] } }
  ]
  if (suggestedName.toLowerCase().endsWith('.fig')) types.reverse()
  return pickBrowserSaveFile({
    suggestedName,
    types
  })
}
