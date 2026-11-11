import type { DocumentSourceOptions } from '@/app/document/io/source/types'

export function createSourceFileWatch(
  options: DocumentSourceOptions,
  hasUnsavedChanges: () => boolean
) {
  let deferred = false
  let disposed = false

  async function start() {
    if (disposed || deferred) return
    await options.startWatchingFile()
  }

  async function afterSave() {
    if (disposed || !deferred || hasUnsavedChanges()) return
    deferred = false
    if (options.getStorageBinding() || !options.hasWritableSource()) return
    try {
      await start()
    } catch (error) {
      deferred = true
      console.warn('[Files] Could not resume watching the recovered file:', error)
    }
  }

  return {
    start,
    afterSave,
    reset: () => {
      deferred = false
    },
    defer: () => {
      deferred = true
      options.stopWatchingFile()
    },
    dispose: () => {
      disposed = true
      options.stopWatchingFile()
    }
  }
}
