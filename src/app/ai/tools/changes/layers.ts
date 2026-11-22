import type { DocumentChange } from '@open-pencil/core'
import type { SceneGraph } from '@open-pencil/scene-graph'

/** The outermost surviving layers a committed edit added or changed. */
export function changedLayerIds(graph: SceneGraph, change: DocumentChange): string[] {
  const ids = new Set(
    [...change.created.map((node) => node.id), ...change.updated.map((node) => node.id)].filter(
      (id) => id !== graph.rootId && graph.getNode(id)?.type !== 'CANVAS'
    )
  )
  return [...ids].filter((id) => {
    const node = graph.getNode(id)
    return node && (!node.parentId || !ids.has(node.parentId))
  })
}
