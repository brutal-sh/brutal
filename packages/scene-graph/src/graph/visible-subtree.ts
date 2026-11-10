import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'

/** Selected roots and their visible descendants, in breadth-first order, each visited once. */
export function* visibleSubtree(
  graph: Pick<SceneGraph, 'getNode'>,
  nodeIds: readonly string[]
): Generator<SceneNode> {
  const pending = [...nodeIds]
  const seen = new Set<string>()
  for (const id of pending) {
    if (seen.has(id)) continue
    seen.add(id)
    const node = graph.getNode(id)
    if (!node?.visible || node.opacity <= 0) continue
    yield node
    // A consumer can change children while checking the node; read them afterwards.
    pending.push(...node.childIds)
  }
}
