import { pickBrowserSaveFile } from '@/app/document/io/capability'

export async function chooseTauriDocumentSavePath(suggestedName = 'Untitled.pen') {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const filters = [
    { name: 'Pen file', extensions: ['pen'] },
    { name: 'Figma file', extensions: ['fig'] }
  ]
  if (suggestedName.toLowerCase().endsWith('.fig')) filters.reverse()
  return save({
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
