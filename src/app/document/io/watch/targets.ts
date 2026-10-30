import type { WatchEvent } from '@tauri-apps/plugin-fs'
import { useIntervalFn } from '@vueuse/core'

const RECENT_WRITE_MS = 1000
const BROWSER_POLL_MS = 2000
const TAURI_WATCH_DELAY_MS = 500

/** Atomic saves create/rename a replacement; access events and sibling files aren't edits. */
export function shouldReloadFile(event: WatchEvent, path: string, lastWriteTime: number) {
  if (event.type === 'other' || (typeof event.type === 'object' && 'access' in event.type))
    return false
  return event.paths.includes(path) && Date.now() - lastWriteTime >= RECENT_WRITE_MS
}

export async function watchTauriFile(
  filePath: string,
  getLastWriteTime: () => number,
  reloadFromDisk: () => void
) {
  const [{ watch: tauriWatch }, { dirname, resolve }] = await Promise.all([
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/api/path')
  ])
  const path = await resolve(filePath)
  const unwatch = await tauriWatch(
    await dirname(path),
    (event) => {
      if (shouldReloadFile(event, path, getLastWriteTime())) reloadFromDisk()
    },
    { delayMs: TAURI_WATCH_DELAY_MS }
  )
  return () => unwatch()
}

export async function watchBrowserFile(
  fileHandle: FileSystemFileHandle,
  getActiveFileHandle: () => FileSystemFileHandle | null,
  getLastWriteTime: () => number,
  reloadFromDisk: () => void,
  stopWatchingFile: () => void
) {
  let lastModified = (await fileHandle.getFile()).lastModified
  const { pause, resume } = useIntervalFn(
    () => {
      void checkBrowserFileModified(fileHandle)
    },
    BROWSER_POLL_MS,
    { immediate: false }
  )
  resume()

  async function checkBrowserFileModified(handle: FileSystemFileHandle) {
    if (getActiveFileHandle() !== handle) {
      stopWatchingFile()
      return
    }
    try {
      const file = await handle.getFile()
      if (file.lastModified > lastModified) {
        lastModified = file.lastModified
        if (Date.now() - getLastWriteTime() < RECENT_WRITE_MS) return
        reloadFromDisk()
      }
    } catch {
      stopWatchingFile()
    }
  }

  return pause
}
