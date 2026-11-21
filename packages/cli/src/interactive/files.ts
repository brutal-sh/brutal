import { extname, resolve } from 'node:path'

import { flushPendingLayout } from '@open-pencil/core/figma-api'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { writeFileAtomic } from '@open-pencil/core/node/fs'
import type { SceneGraph } from '@open-pencil/scene-graph'

const io = new IORegistry(BUILTIN_IO_FORMATS)

export function interactiveOutput(path: string): { path: string; format: 'pen' | 'fig' } {
  const extension = extname(path).toLowerCase()
  if (extension !== '.brut' && extension !== '.pen' && extension !== '.fig')
    throw new Error('Interactive output must end in .brut, .pen, or .fig.')
  return { path: resolve(path), format: extension === '.fig' ? 'fig' : 'pen' }
}

export async function saveInteractiveDocument(graph: SceneGraph, path: string): Promise<void> {
  const output = interactiveOutput(path)
  flushPendingLayout(graph)
  const result = await io.writeDocument(
    output.format,
    graph,
    output.format === 'fig' ? { renderThumbnail: true } : undefined
  )
  await writeFileAtomic(output.path, result.data, { fallback: 'refuse' })
}
