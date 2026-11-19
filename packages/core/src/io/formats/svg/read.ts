import { SceneGraph } from '@open-pencil/scene-graph'

import { MAX_SVG_DOCUMENT_BYTES } from '#core/io/formats/shared'
import type { ReadDocumentInput, ReadDocumentResult } from '#core/io/types'
import { layoutAuthoredNodes } from '#core/layout'

import { createSVGNodes } from './import'

async function decompressSVG(bytes: Uint8Array): Promise<string> {
  const reader = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader()
  const decoder = new TextDecoder()
  let markup = ''
  let size = 0
  try {
    for (;;) {
      const chunk = await reader.read().catch(() => {
        throw new Error('Could not decompress this SVGZ file.')
      })
      if (chunk.done) return markup + decoder.decode()
      size += chunk.value.byteLength
      if (size > MAX_SVG_DOCUMENT_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new Error('SVG artwork must be 4 MB or smaller after decompression.')
      }
      markup += decoder.decode(chunk.value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

export async function readSVGDocument(input: ReadDocumentInput): Promise<ReadDocumentResult> {
  if (input.data.byteLength > MAX_SVG_DOCUMENT_BYTES)
    throw new Error('SVG artwork must be 4 MB or smaller.')
  const markup = input.name?.toLowerCase().endsWith('.svgz')
    ? await decompressSVG(input.data)
    : new TextDecoder().decode(input.data)
  const graph = new SceneGraph()
  const node = createSVGNodes(graph, graph.getPages()[0].id, markup)
  if (!node) throw new Error('This SVG has no supported vector or text layers.')
  if (node.type === 'FRAME') graph.updateNode(node.id, { fills: [] })
  layoutAuthoredNodes(graph, [node.id])
  return { graph, sourceFormat: 'svg' }
}
