import type { FileInfo, WatchEvent } from '@tauri-apps/plugin-fs'
import { useIntervalFn } from '@vueuse/core'

const RECENT_WRITE_MS = 1000
const BROWSER_POLL_MS = 2000
const TAURI_WATCH_DELAY_MS = 500

/** Atomic saves create/rename a replacement; access events and sibling files aren't edits. */
function canReloadFile(event: WatchEvent, lastWriteTime: number) {
  if (event.type === 'other' || (typeof event.type === 'object' && 'access' in event.type))
    return false
  return Date.now() - lastWriteTime >= RECENT_WRITE_MS
}

export function shouldReloadFile(event: WatchEvent, path: string, lastWriteTime: number) {
  return event.paths.includes(path) && canReloadFile(event, lastWriteTime)
}

export function sameWatchDirectory(
  left: Pick<FileInfo, 'dev' | 'ino' | 'isDirectory'>,
  right: Pick<FileInfo, 'dev' | 'ino' | 'isDirectory'>
) {
  return (
    left.isDirectory &&
    right.isDirectory &&
    Number.isSafeInteger(left.dev) &&
    Number.isSafeInteger(left.ino) &&
    (left.ino ?? 0) > 0 &&
    left.dev === right.dev &&
    left.ino === right.ino
  )
}

export async function watchTauriFile(
  filePath: string,
  getLastWriteTime: () => number,
  reloadFromDisk: () => void
) {
  const [{ watch: tauriWatch, stat }, { basename, dirname, resolve }] = await Promise.all([
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/api/path')
  ])
  const path = await resolve(filePath)
  const folder = await dirname(path)
  const name = await basename(path)
  const identity = await stat(folder).catch(() => null)
  let active = true
  const isActive = () => active
  async function onEvent(event: WatchEvent) {
    const lastWrite = getLastWriteTime()
    if (!isActive() || !canReloadFile(event, lastWrite)) return
    let matches = shouldReloadFile(event, path, lastWrite)
    // Native events can spell a watched parent through a different alias, such as /private/var.
    if (!matches && identity)
      for (const changed of event.paths) {
        if (!isActive()) return
        if ((await basename(changed).catch(() => null)) !== name) continue
        const parent = await dirname(changed)
          .then(stat)
          .catch(() => null)
        if (parent && sameWatchDirectory(identity, parent)) {
          matches = true
          break
        }
      }
    if (isActive() && matches && canReloadFile(event, getLastWriteTime())) reloadFromDisk()
  }
  const unwatch = await tauriWatch(folder, (event) => void onEvent(event), {
    delayMs: TAURI_WATCH_DELAY_MS
  })
  return () => {
    active = false
    unwatch()
  }
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
