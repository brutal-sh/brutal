import type { FileInfo, WatchEvent } from '@tauri-apps/plugin-fs'
import { useIntervalFn, useTimeoutFn } from '@vueuse/core'

const RECENT_WRITE_MS = 1000
const BROWSER_POLL_MS = 2000
const TAURI_WATCH_DELAY_MS = 500

type TauriFileWatchOptions = {
  ignoreMetadata?: boolean
}

/** Atomic saves create or rename a replacement. A metadata event can be a permissions change. */
function canReloadFile(
  { type }: WatchEvent,
  lastWriteTime: number,
  { ignoreMetadata }: TauriFileWatchOptions
) {
  if (type === 'other') return false
  if (typeof type === 'object') {
    if ('access' in type) return false
    if (ignoreMetadata && 'modify' in type && type.modify.kind === 'metadata') return false
  }
  return Date.now() - lastWriteTime >= RECENT_WRITE_MS
}

export function shouldReloadFile(
  event: WatchEvent,
  path: string,
  lastWriteTime: number,
  options: TauriFileWatchOptions = {}
) {
  return event.paths.includes(path) && canReloadFile(event, lastWriteTime, options)
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
  reloadFromDisk: () => void,
  options: TauriFileWatchOptions = {}
) {
  const [{ watchImmediate, stat }, { basename, dirname, resolve }] = await Promise.all([
    import('@tauri-apps/plugin-fs'),
    import('@tauri-apps/api/path')
  ])
  const path = await resolve(filePath)
  const folder = await dirname(path)
  const name = await basename(path)
  const identity = await stat(folder).catch(() => null)
  let active = true
  const isActive = () => active
  const reload = useTimeoutFn(
    () => {
      if (isActive() && Date.now() - getLastWriteTime() >= RECENT_WRITE_MS) reloadFromDisk()
    },
    TAURI_WATCH_DELAY_MS,
    { immediate: false }
  )
  async function onEvent(event: WatchEvent) {
    const lastWrite = getLastWriteTime()
    if (!isActive() || !canReloadFile(event, lastWrite, options)) return
    let matches = shouldReloadFile(event, path, lastWrite, options)
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
    if (isActive() && matches && canReloadFile(event, getLastWriteTime(), options)) reload.start()
  }
  // The plugin's debounced watcher synchronously walks the folder to seed its rename cache.
  const unwatch = await watchImmediate(folder, (event) => void onEvent(event))
  return () => {
    active = false
    reload.stop()
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
