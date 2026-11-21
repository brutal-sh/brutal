import { extname } from 'pathe'

import { DEFAULT_DOCUMENT_EXTENSION } from '@/app/document/io/names'

export type DocumentSaveFormat = 'fig' | 'pen'

/** A local destination determines its encoding. .brut and .pen share the same codec. */
export function documentSaveFormat(name: string): DocumentSaveFormat {
  const extension = extname(name).toLowerCase()
  if (extension === DEFAULT_DOCUMENT_EXTENSION || extension === '.pen') return 'pen'
  if (extension === '.fig' || extension === '') return 'fig'
  throw new Error('Choose a file name ending in .brut, .pen, or .fig.')
}

export function documentSaveMime(format: DocumentSaveFormat): string {
  return format === 'pen' ? 'application/json' : 'application/octet-stream'
}
