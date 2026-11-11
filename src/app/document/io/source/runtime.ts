import type { createAutosave } from '@/app/document/autosave'
import { createDocumentChanges } from '@/app/document/io/changes'
import { createSourceBuilders } from '@/app/document/io/source/builders'
import { createSourceSaveQueue } from '@/app/document/io/source/save/queue'
import type { DocumentSourceOptions, SourceContext } from '@/app/document/io/source/types'
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
    getSavedVersion: input.getSavedVersion,
    setSavedVersion: input.setSavedVersion,
    setLastWriteTime: input.setLastWriteTime,
    getRenderer: input.getRenderer
  }
  const changes = createDocumentChanges(options.editor)
  const builders = createSourceBuilders(options)
  const queue = createSourceSaveQueue(changes)
  const recovery = createDocumentRecovery({
    state: options.state,
    version: changes.capture,
    hasUnsavedChanges: changes.hasUnsavedChanges,
    isEnabled: () => recoveryEnabled.value,
    buildFigFile: builders.buildRecoveryFigFile,
    hasWritableSource: options.hasWritableSource
  })
  return { options, changes, builders, queue, recovery }
}

export function disposeSource(context: SourceContext, autosave: ReturnType<typeof createAutosave>) {
  context.queue.dispose()
  context.changes.dispose()
  context.options.stopWatchingFile()
  autosave.disposeAutosave()
  context.recovery.disposeRecovery()
}
