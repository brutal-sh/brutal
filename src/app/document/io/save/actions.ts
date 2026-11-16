import { createDocumentWriter } from '@/app/document/io/write'

import { saveCurrentDocument } from './current'
import { saveDocumentAs } from './destination'
import type { SaveActionsOptions } from './types'

export function createSaveActions(options: SaveActionsOptions) {
  const writeFile = createDocumentWriter(options)
  const context = { ...options, writeFile }
  return {
    saveFigFile: (beforeWrite?: () => void) => saveCurrentDocument(context, beforeWrite),
    saveFigFileAs: () => saveDocumentAs(context),
    writeFile
  }
}
