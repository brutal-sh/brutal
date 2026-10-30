import type { SceneGraph } from '@open-pencil/scene-graph'
import { computeImageHash, nodeImageHashes } from '@open-pencil/scene-graph/images'

/** Content-addressed imports and frames another paint uses must remain immutable. */
export function isSharedShaderFrame(graph: SceneGraph, image: string): boolean {
  const bytes = graph.images.get(image)
  if (bytes && computeImageHash(bytes) === image) return true
  let references = 0
  for (const node of graph.getAllNodes())
    for (const hash of nodeImageHashes(node)) if (hash === image && ++references > 1) return true
  return false
}
