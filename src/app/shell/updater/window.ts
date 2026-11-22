export const UPDATER_WINDOW_LABEL = 'updater'
export const EDITOR_WINDOW_LABEL = 'main'
export const UPDATE_DEFERRED_EVENT = 'updater:deferred'
/** Separate Vite entry, so the window never boots the editor. */
export const UPDATER_WINDOW_URL = 'updater.html'

const UPDATER_WINDOW_WIDTH = 560
const UPDATER_WINDOW_HEIGHT = 520
let opening: Promise<void> | null = null

/** Shows the Software Update window, focusing it when it is already open. */
export function openUpdaterWindow(title: string): Promise<void> {
  opening ??= showUpdaterWindow(title).finally(() => {
    opening = null
  })
  return opening
}

async function showUpdaterWindow(title: string): Promise<void> {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const existing = await WebviewWindow.getByLabel(UPDATER_WINDOW_LABEL)
  if (existing) {
    await existing.unminimize()
    await existing.show()
    await existing.setFocus()
    return
  }

  const window = new WebviewWindow(UPDATER_WINDOW_LABEL, {
    url: UPDATER_WINDOW_URL,
    title,
    width: UPDATER_WINDOW_WIDTH,
    height: UPDATER_WINDOW_HEIGHT,
    minWidth: UPDATER_WINDOW_WIDTH,
    minHeight: UPDATER_WINDOW_HEIGHT,
    center: true,
    minimizable: false,
    maximizable: false,
    dragDropEnabled: false,
    focus: true
  })
  await new Promise<void>((resolve, reject) => {
    void window.once('tauri://created', () => resolve()).catch(reject)
    void window
      .once('tauri://error', ({ payload }) => {
        reject(payload instanceof Error ? payload : new Error(String(payload)))
      })
      .catch(reject)
  })
}

/** Keep the updater alive so its release and download handle survive Later. */
export async function deferUpdaterWindow(version: string): Promise<boolean> {
  const [{ getCurrentWindow, Window }, { emitTo }] = await Promise.all([
    import('@tauri-apps/api/window'),
    import('@tauri-apps/api/event')
  ])
  if (!(await Window.getByLabel(EDITOR_WINDOW_LABEL))) return false
  const window = getCurrentWindow()
  await window.hide()
  try {
    await emitTo(EDITOR_WINDOW_LABEL, UPDATE_DEFERRED_EVENT, { version })
    return true
  } catch (error) {
    await window.show()
    throw error
  }
}
