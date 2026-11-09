import { cloneNodeProps, type NodeCloneMode } from '../copy'
import { noteOfNode } from '../generated/notes/model'
import type { SceneGraph } from '../graph'
import { scriptOfNode } from '../scripts/model'
import type { SceneNode } from '../types'
import { createInstanceOverrideState } from './overrides'
import { sourceInTargetCoordinates } from './properties'

export function cloneChildInCoordinates(
  graph: SceneGraph,
  src: SceneNode,
  parents: { source: SceneNode; target: SceneNode },
  mode: NodeCloneMode = 'deep'
): SceneNode {
  const { source: sourceParent, target: targetParent } = parents
  const componentScale =
    (src.componentScale * targetParent.componentScale) / sourceParent.componentScale
  const properties = cloneNodeProps(sourceInTargetCoordinates(src, componentScale), src.id, mode)
  // This Note copy follows the instance prototype; inherited values are not local claims.
  if (src.type === 'INSTANCE' && noteOfNode(src))
    properties.instanceOverrides = createInstanceOverrideState()
  return graph.createNode(src.type, targetParent.id, {
    ...properties,
    componentScale
  })
}

export function cloneChildrenWithMapping(
  graph: SceneGraph,
  sourceParentId: string,
  destParentId: string,
  mode: NodeCloneMode = 'deep'
): void {
  // A cyclic component, such as an instance of an ancestor, would clone itself without end.
  if (sourceParentId === destParentId || graph.isDescendant(destParentId, sourceParentId)) return

  const sourceParent = graph.nodes.get(sourceParentId)
  const targetParent = graph.nodes.get(destParentId)
  if (!sourceParent || !targetParent || scriptOfNode(sourceParent)) return

  for (const childId of sourceParent.childIds) {
    const src = graph.nodes.get(childId)
    if (!src) continue

    const clone = cloneChildInCoordinates(
      graph,
      src,
      { source: sourceParent, target: targetParent },
      mode
    )

    if (src.childIds.length > 0) {
      cloneChildrenWithMapping(graph, childId, clone.id, mode)
    }
  }
}
