import { pickBrowserSaveFile } from '@/app/document/io/capability'

export async function chooseTauriDocumentSavePath(suggestedName = 'Untitled.fig') {
  const { save } = await import('@tauri-apps/plugin-dialog')
  return save({
    defaultPath: suggestedName,
    filters: [
      { name: 'Figma file', extensions: ['fig'] },
      { name: 'Pen file', extensions: ['pen'] }
    ]
  })
}

/** Null means no picker; cancellation rejects with AbortError so it never opens a second prompt. */
export function chooseBrowserDocumentSaveHandle(suggestedName = 'Untitled.fig') {
  return pickBrowserSaveFile({
    suggestedName,
    types: [
      { description: 'Figma file', accept: { 'application/octet-stream': ['.fig'] } },
      { description: 'Pen file', accept: { 'application/json': ['.pen'] } }
    ]
  })
}
