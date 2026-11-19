import type { IOFormatAdapter } from '#core/io/types'

export const MAX_SKETCH_BYTES = 64 * 1024 * 1024

export const sketchFormat: IOFormatAdapter<'sketch'> = {
  id: 'sketch',
  label: 'Sketch Design',
  role: 'interchange-document',
  category: 'document',
  extensions: ['sketch'],
  mimeTypes: [],
  support: { readDocument: true },
  maxReadBytes: MAX_SKETCH_BYTES,
  async readDocument(input) {
    const { readSketchDocument } = await import('./index')
    return readSketchDocument(input.data)
  }
}
