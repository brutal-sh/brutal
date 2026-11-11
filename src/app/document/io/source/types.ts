import type { Editor, EditorState } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'

import type { createDocumentChanges } from '@/app/document/io/changes'
import type { createSaveActions } from '@/app/document/io/save/actions'
import type { createSourceBuilders } from '@/app/document/io/source/builders'
import type { createSourceSaveQueue } from '@/app/document/io/source/save/queue'
import type { createSourceFileWatch } from '@/app/document/io/source/watch'
import type { DocumentSourceAccess, DocumentSourceIdentity } from '@/app/document/io/types'
import type { DocumentRecoveryController } from '@/app/document/recovery'

export type DocumentSourceState = EditorState & {
  documentName: string
  autosaveEnabled: boolean
}

export type DocumentSourceOptions = DocumentSourceAccess & {
  io: IORegistry
  getSourceIdentity: () => DocumentSourceIdentity
  editor: Editor
  state: DocumentSourceState
  stopWatchingFile: () => void
  startWatchingFile: () => Promise<void>
  getRenderer: () => Editor['renderer']
}

export interface SourceContext {
  options: DocumentSourceOptions
  changes: ReturnType<typeof createDocumentChanges>
  builders: ReturnType<typeof createSourceBuilders>
  queue: ReturnType<typeof createSourceSaveQueue>
  recovery: DocumentRecoveryController
  fileWatch: ReturnType<typeof createSourceFileWatch>
}

export type SourceSaveContext = SourceContext & {
  fileSaves: ReturnType<typeof createSaveActions>
}
