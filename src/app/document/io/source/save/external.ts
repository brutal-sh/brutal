import { documentSaveFormat } from '@/app/document/io/save/format'
import { setPlannedFilePath } from '@/app/document/io/source/identity'
import type { SourceSaveContext } from '@/app/document/io/source/types'
import { storageLocationOf } from '@/app/integrations/storage/location'
import type { StorageLocation } from '@/app/integrations/storage/types'
import { createCanvasId } from '@/app/storage/id'
import { isTauri } from '@/app/tauri/env'

async function saveToNewTarget(
  context: SourceSaveContext,
  planTarget: () => void
): Promise<boolean> {
  const {
    getFilePath,
    getFileHandle,
    getStorageBinding,
    getDownloadName,
    state,
    setStorageBinding,
    setFileHandle,
    setFilePath,
    setDownloadName,
    startWatchingFile
  } = context.options
  const previous = {
    filePath: getFilePath(),
    fileHandle: getFileHandle(),
    storageBinding: getStorageBinding(),
    downloadName: getDownloadName(),
    documentName: state.documentName
  }
  const restore = () => {
    setStorageBinding(previous.storageBinding)
    setFileHandle(previous.fileHandle)
    setFilePath(previous.filePath)
    setDownloadName(previous.downloadName)
    state.documentName = previous.documentName
    if (previous.filePath || previous.fileHandle) void startWatchingFile()
  }
  planTarget()
  try {
    const saved = await context.queue.track(context.fileSaves.saveFigFile)
    if (!saved) restore()
    return saved
  } catch (error) {
    restore()
    throw error
  }
}

async function saveFigFileToPath(context: SourceSaveContext, path: string): Promise<boolean> {
  if (!isTauri()) return false
  const saved = await saveToNewTarget(context, () => setPlannedFilePath(context, path))
  if (saved) void context.options.startWatchingFile()
  return saved
}

async function saveFigFileCopy(
  context: SourceSaveContext,
  write: (data: Uint8Array) => Promise<void>,
  fileName = 'Untitled.fig'
): Promise<boolean> {
  const version = context.changes.capture()
  const build =
    documentSaveFormat(fileName) === 'pen'
      ? context.builders.buildPenFile
      : context.builders.buildFigFile
  await write(await build())
  await context.recovery.markProtectedVersion(version)
  return true
}

async function saveFigFileToStorage(
  context: SourceSaveContext,
  location: StorageLocation
): Promise<boolean> {
  const {
    stopWatchingFile,
    setFileHandle,
    setFilePath,
    setDownloadName,
    setStorageBinding,
    state,
    setSourceIdentity
  } = context.options
  const saved = await saveToNewTarget(context, () => {
    stopWatchingFile()
    setFileHandle(null)
    setFilePath(null)
    setDownloadName(`${state.documentName}.fig`)
    setStorageBinding({ ...storageLocationOf(location), documentId: createCanvasId() })
  })
  if (saved) {
    setSourceIdentity({ handle: null, path: null })
    state.autosaveEnabled = true
  }
  return saved
}

export function createSourceExternalSaves(context: SourceSaveContext) {
  return {
    saveFigFileToPath: (path: string) =>
      context.queue.serialize(() => saveFigFileToPath(context, path)),
    saveFigFileCopy: (write: (data: Uint8Array) => Promise<void>, fileName?: string) =>
      context.queue.serialize(() =>
        context.queue.track(() => saveFigFileCopy(context, write, fileName))
      ),
    saveFigFileToStorage: (location: StorageLocation) =>
      context.queue.serialize(() => saveFigFileToStorage(context, location))
  }
}
