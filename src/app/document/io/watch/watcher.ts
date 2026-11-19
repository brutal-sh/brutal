import { watchBrowserFile, watchTauriFile } from '@/app/document/io/watch/targets'
import { IS_TAURI } from '@/constants'

type FileWatchOptions = {
  getFilePath: () => string | null
  getFileHandle: () => FileSystemFileHandle | null
  getLastWriteTime: () => number
  reloadFromDisk: () => void
}

export function createFileWatcher({
  getFilePath,
  getFileHandle,
  getLastWriteTime,
  reloadFromDisk
}: FileWatchOptions) {
  let unwatchFile: (() => void) | null = null
  let generation = 0

  function stopWatchingFile() {
    generation++
    if (unwatchFile) {
      unwatchFile()
      unwatchFile = null
    }
  }

  async function startWatchingFile() {
    stopWatchingFile()
    const request = generation
    const reload = () => {
      if (request === generation) reloadFromDisk()
    }
    const stop = () => {
      if (request === generation) stopWatchingFile()
    }
    const filePath = getFilePath()
    const fileHandle = getFileHandle()

    let release: (() => void) | null = null
    if (filePath && IS_TAURI) {
      release = await watchTauriFile(filePath, getLastWriteTime, reload, { ignoreMetadata: true })
    } else if (fileHandle) {
      release = await watchBrowserFile(fileHandle, getFileHandle, getLastWriteTime, reload, stop)
    }
    if (request !== generation) release?.()
    else unwatchFile = release
  }

  return { startWatchingFile, stopWatchingFile }
}
