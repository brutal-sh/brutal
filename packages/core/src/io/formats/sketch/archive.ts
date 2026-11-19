import { unzipSync } from 'fflate'
import * as v from 'valibot'

import { MAX_SKETCH_BYTES } from './adapter'
const MAX_JSON_BYTES = 16 * 1024 * 1024
const MAX_ENTRIES = 4096

export type SketchArchive = Partial<Record<string, Uint8Array>>

export function readSketchArchive(data: Uint8Array): SketchArchive {
  if (data.length > MAX_SKETCH_BYTES)
    throw new Error('The Sketch file exceeds the 64 MB import limit.')
  if (data.length < 22) throw new Error('The Sketch file is not a readable ZIP archive.')
  let expanded = 0
  const seen = new Set<string>()
  return unzipSync(data, {
    filter({ name, originalSize, size }) {
      if (seen.size >= MAX_ENTRIES || seen.has(name)) {
        throw new Error('The Sketch archive has too many entries or contains duplicate entries.')
      }
      seen.add(name)
      const json = name === 'document.json' || /^pages\/[\w-]+\.json$/.test(name)
      const image = /^images\/[\w.-]+\.(?:png|jpe?g|webp|gif)$/i.test(name)
      if (!json && !image) return false
      const entrySize = Math.max(originalSize, size)
      expanded += entrySize
      if (expanded > MAX_SKETCH_BYTES || (json && entrySize > MAX_JSON_BYTES)) {
        throw new Error('The Sketch archive exceeds the import size limit.')
      }
      return true
    }
  })
}

export function readSketchJSON<TOutput>(
  archive: SketchArchive,
  path: string,
  schema: v.BaseSchema<unknown, TOutput, v.BaseIssue<unknown>>
): TOutput {
  const bytes = archive[path]
  if (!bytes) throw new Error(`The Sketch archive is missing ${path}.`)
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), schema),
    new TextDecoder().decode(bytes),
    {
      abortEarly: true
    }
  )
  if (!parsed.success) throw new Error(`The Sketch archive contains invalid data in ${path}.`)
  return parsed.output
}
