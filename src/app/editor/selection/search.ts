import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

/** Search the current page in layer order, including hidden and nested layers. */
export function findLayers(graph: SceneGraph, pageId: string, query: string): SceneNode[] {
  const term = query.trim().toLocaleLowerCase()
  if (!term) return []
  const found: SceneNode[] = []
  const pending = [...graph.getChildren(pageId)].reverse()
  while (pending.length) {
    const node = pending.pop()
    if (!node) break
    if ([node.name, node.id, node.text].some((value) => value.toLocaleLowerCase().includes(term)))
      found.push(node)
    pending.push(...[...graph.getChildren(node.id)].reverse())
  }
  return found
}
