import { createReloadActions } from '@/app/document/io/reload'
import {
  createDocumentSourceActions,
  createDocumentSourceState
} from '@/app/document/io/source/actions'
import type { DocumentSourceOptions } from '@/app/document/io/source/types'
import { createFileWatcher } from '@/app/document/io/watch/watcher'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'

type DocumentSourceConnection = Pick<DocumentSourceOptions, 'editor' | 'state' | 'io'> & {
  preparationController: EditorPreparationController
}

export function createDocumentSourceConnection(options: DocumentSourceConnection) {
  const sourceState = createDocumentSourceState()
  const reload = createReloadActions({
    ...options,
    getFilePath: sourceState.getFilePath,
    getFileHandle: sourceState.getFileHandle,
    hasUnsavedChanges: () => sourceActions.hasUnsavedChanges(),
    captureVersion: () => captureVersion(),
    markDocumentSaved: () => sourceActions.markDocumentSaved()
  })
  const watching = createFileWatcher({
    getFilePath: sourceState.getFilePath,
    getFileHandle: sourceState.getFileHandle,
    getLastWriteTime: sourceState.getLastWriteTime,
    reloadFromDisk: () => {
      void reload.reloadFromDisk()
    }
  })
  const { captureVersion, ...sourceActions } = createDocumentSourceActions({
    ...options,
    ...watching,
    ...sourceState,
    getRenderer: () => options.editor.renderer
  })
  return { sourceState, sourceActions, reload }
}
