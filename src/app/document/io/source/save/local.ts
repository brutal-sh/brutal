import { createAutosave } from '@/app/document/autosave'
import { createSaveActions } from '@/app/document/io/save/actions'
import type { SourceContext, SourceSaveContext } from '@/app/document/io/source/types'
import { rememberRecentFile } from '@/app/recent-files'
import { isTauri } from '@/app/tauri/env'

export function createSourceFileSaves(context: SourceContext) {
  return createSaveActions({
    ...context.options,
    nativeSource: context.nativeSource,
    version: context.changes.capture,
    buildFigFile: context.builders.buildFigFile,
    buildPenFile: context.builders.buildPenFile,
    startWatchingFile: () => {
      void context.fileWatch.start()
    },
    onWriteSuccess: async (version) => {
      await context.recovery.markProtectedVersion(version)
      const path = context.options.getFilePath()
      if (path && isTauri()) rememberRecentFile(path)
    },
    onDownloadSuccess: (version) => context.recovery.markProtectedVersion(version)
  })
}

export function createSourceAutosave(context: SourceSaveContext) {
  return createAutosave({
    state: context.options.state,
    version: context.changes.capture,
    getSavedVersion: context.options.getSavedVersion,
    hasWritableSource: context.options.hasWritableSource,
    saveCurrentDocument: async () => {
      await context.queue.serialize(() => context.queue.track(context.fileSaves.saveFigFile))
    }
  })
}
