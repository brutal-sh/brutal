import { extname } from 'pathe'

export type DocumentSaveFormat = 'fig' | 'pen'

/** A local destination determines its encoding; never write FIG bytes to a .pen path. */
export function documentSaveFormat(name: string): DocumentSaveFormat {
  const extension = extname(name).toLowerCase()
  if (extension === '.pen') return 'pen'
  if (extension === '.fig' || extension === '') return 'fig'
  throw new Error('Choose a file name ending in .fig or .pen.')
}

export function documentSaveMime(format: DocumentSaveFormat): string {
  return format === 'pen' ? 'application/json' : 'application/octet-stream'
}
