import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { noteOfNode } from '@open-pencil/scene-graph/generated'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'

/** Pen renders a Note's background opaque while retaining its authored color alpha on save. */
export function resolvedNodePaints(graph: SceneGraph, node: SceneNode) {
  const paints = resolvedPaintBindings(graph, node)
  if (!noteOfNode(node)) return paints
  return {
    ...paints,
    fills: (paints.fills ?? node.fills).map((fill) => ({
      ...fill,
      color: { ...fill.color, a: 1 },
      opacity: 1
    }))
  }
}
