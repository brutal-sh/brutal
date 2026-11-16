import type { DocumentSaveFormat } from './format'
import type { SaveContext, VersionedFile } from './types'

export async function buildVersionedFile(
  context: SaveContext,
  format: DocumentSaveFormat
): Promise<VersionedFile> {
  const version = context.version()
  const build = format === 'pen' ? context.buildPenFile : context.buildFigFile
  if (!build) throw new Error('This document cannot be saved as .pen. Choose .fig instead.')
  return { data: await build(), version, format }
}
