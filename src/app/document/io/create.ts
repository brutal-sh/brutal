import type { Editor } from '@open-pencil/core'
import { prefetchFigmaSchema } from '@open-pencil/core/clipboard'
import type { IORegistry } from '@open-pencil/core/io'

import { createDocumentViewportActions, downloadBlob } from '@/app/document/io/browser'
import { createDOMOpenActions } from '@/app/document/io/dom'
import { createOpenActions } from '@/app/document/io/read'
import { createDocumentSourceConnection } from '@/app/document/io/source/connection'
import type { DocumentSourceState } from '@/app/document/io/source/types'
import type { ViewportSize } from '@/app/document/io/types'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'

type DocumentIOArguments = [
  editor: Editor,
  state: DocumentSourceState,
  viewportSize: ViewportSize,
  preparationController: EditorPreparationController,
  io: IORegistry
]

export function createDocumentIOActions(
  ...[editor, state, viewportSize, preparationController, io]: DocumentIOArguments
) {
  void prefetchFigmaSchema()
  const { sourceState, sourceActions, reload } = createDocumentSourceConnection({
    editor,
    state,
    preparationController,
    io
  })
  const viewport = createDocumentViewportActions(editor, viewportSize)
  return {
    ...sourceActions,
    ...viewport,
    ...createOpenActions({
      editor,
      state,
      setDocumentSource: sourceActions.setDocumentSource,
      fitCurrentPageToViewport: viewport.fitCurrentPageToViewport,
      preparationController
    }),
    ...createDOMOpenActions({
      editor,
      state,
      setDocumentSource: sourceActions.setDocumentSource,
      fitCurrentPageToViewport: viewport.fitCurrentPageToViewport,
      preparationController
    }),
    downloadBlob,
    getDocumentFilePath: sourceState.getFilePath,
    getSourceIdentity: sourceState.getSourceIdentity,
    hasWritableSource: sourceState.hasWritableSource,
    externalFileChange: reload.externalFileChange,
    lastReloadFailed: reload.lastReloadFailed,
    ignoreExternalFileChange: reload.ignoreExternalFileChange,
    reloadExternalFileChange: reload.reloadExternalFileChange,
    disposeDocumentIO: () => {
      reload.dispose()
      sourceActions.disposeDocumentIO()
    }
  }
}
