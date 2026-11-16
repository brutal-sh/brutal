import type { EditorState } from '@open-pencil/core'

import type { DocumentSourceAccess } from '@/app/document/io/types'
import type { createDocumentWriter } from '@/app/document/io/write'

import type { DocumentSaveFormat } from './format'

export type SaveActionsOptions = Omit<DocumentSourceAccess, 'getSavedVersion'> & {
  state: EditorState & { documentName: string }
  version: () => number
  buildFigFile: () => Uint8Array | Promise<Uint8Array>
  buildPenFile?: () => Uint8Array | Promise<Uint8Array>
  startWatchingFile: () => void
  onWriteSuccess?: (version: number) => void | Promise<void>
  onDownloadSuccess?: (version: number) => void | Promise<void>
}

export type SaveContext = SaveActionsOptions & {
  writeFile: ReturnType<typeof createDocumentWriter>
}

export interface VersionedFile {
  data: Uint8Array
  version: number
  format: DocumentSaveFormat
}
