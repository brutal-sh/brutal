import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'

type InstanceIndex = SceneGraph['instanceIndex']

export function indexInstance(index: InstanceIndex, componentId: string, instanceId: string): void {
  let set = index.get(componentId)
  if (!set) {
    set = new Set()
    index.set(componentId, set)
  }
  set.add(instanceId)
}

export function unindexInstance(
  index: InstanceIndex,
  componentId: string,
  instanceId: string
): void {
  index.get(componentId)?.delete(instanceId)
}

export function updateInstanceIndex(
  index: InstanceIndex,
  node: SceneNode,
  changes: Partial<SceneNode>
): void {
  if (!('type' in changes) && !('componentId' in changes)) return
  const before = node.type === 'INSTANCE' ? node.componentId : null
  const componentId = 'componentId' in changes ? changes.componentId : node.componentId
  const after = (changes.type ?? node.type) === 'INSTANCE' ? componentId : null
  if (before === after) return
  if (before) unindexInstance(index, before, node.id)
  if (after) indexInstance(index, after, node.id)
}
