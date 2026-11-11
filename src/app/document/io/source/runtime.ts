import type { createAutosave } from '@/app/document/autosave'
import { createDocumentChanges } from '@/app/document/io/changes'
import { createSourceBuilders } from '@/app/document/io/source/builders'
import { getRecoveryFileSource } from '@/app/document/io/source/recovery'
import { createSourceSaveQueue } from '@/app/document/io/source/save/queue'
import type { DocumentSourceOptions, SourceContext } from '@/app/document/io/source/types'
import { createSourceFileWatch } from '@/app/document/io/source/watch'
import { createDocumentRecovery } from '@/app/document/recovery'
import { recoveryEnabled } from '@/app/document/recovery/preferences'

export function createSourceContext(input: DocumentSourceOptions): SourceContext {
  const options: DocumentSourceOptions = {
    io: input.io,
    editor: input.editor,
    state: input.state,
    stopWatchingFile: input.stopWatchingFile,
    startWatchingFile: input.startWatchingFile,
    getFileHandle: input.getFileHandle,
    setFileHandle: input.setFileHandle,
    getFilePath: input.getFilePath,
    setFilePath: input.setFilePath,
    getDownloadName: input.getDownloadName,
    setDownloadName: input.setDownloadName,
    getStorageBinding: input.getStorageBinding,
    setStorageBinding: input.setStorageBinding,
    hasWritableSource: input.hasWritableSource,
    setSourceIdentity: input.setSourceIdentity,
    getSourceIdentity: input.getSourceIdentity,
    getSavedVersion: input.getSavedVersion,
    setSavedVersion: input.setSavedVersion,
    setLastWriteTime: input.setLastWriteTime,
    getRenderer: input.getRenderer
  }
  const changes = createDocumentChanges(options.editor)
  const builders = createSourceBuilders(options)
  const fileWatch = createSourceFileWatch(options, changes.hasUnsavedChanges)
  const queue = createSourceSaveQueue(changes, fileWatch.afterSave)
  const recovery = createDocumentRecovery({
    state: options.state,
    version: changes.capture,
    hasUnsavedChanges: changes.hasUnsavedChanges,
    isEnabled: () => recoveryEnabled.value,
    buildFigFile: builders.buildRecoveryFigFile,
    hasWritableSource: options.hasWritableSource,
    getSource: () => getRecoveryFileSource(options)
  })
  return { options, changes, builders, queue, recovery, fileWatch }
}

export function disposeSource(context: SourceContext, autosave: ReturnType<typeof createAutosave>) {
  context.queue.dispose()
  context.changes.dispose()
  context.fileWatch.dispose()
  autosave.disposeAutosave()
  context.recovery.disposeRecovery()
}
