import type { SceneGraph } from '../graph'
import { findInstanceAncestor } from '../instances'
import type { SceneNode } from '../types'
import { scaleVariableBindingUnits } from '../variables/units'
import { scaleNodeChanges } from './node'

const MIN_SCALE = 0.01
const RESCALABLE_NODE_TYPES = new Set<SceneNode['type']>([
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'COMPONENT_SET',
  'ELLIPSE',
  'FRAME',
  'GROUP',
  'INSTANCE',
  'LINE',
  'POLYGON',
  'RECTANGLE',
  'STAR',
  'STICKY',
  'TEXT',
  'VECTOR'
])

export function canRescaleNode(node: SceneNode): boolean {
  return RESCALABLE_NODE_TYPES.has(node.type)
}

/** Content dimensions and the units that keep variable bindings and instances proportional. */
export function rescaleNodeChanges(
  graph: SceneGraph,
  node: SceneNode,
  scale: number,
  scalePosition: boolean
): Partial<SceneNode> {
  return {
    ...scaleNodeChanges(node, scale, scalePosition),
    ...scaleVariableBindingUnits(node, scale),
    componentScale: findInstanceAncestor(graph, node.id)
      ? node.componentScale * scale
      : node.componentScale
  }
}

/** Scale a node tree from the root node's top-left, matching Figma's Scale tool. */
export function rescaleNodeTree(graph: SceneGraph, rootId: string, scale: number): void {
  if (!Number.isFinite(scale)) throw new TypeError('Scale must be a finite number')
  if (scale < MIN_SCALE) throw new RangeError(`Scale must be at least ${MIN_SCALE}`)
  const root = graph.getNode(rootId)
  if (!root || !canRescaleNode(root)) throw new Error('rescale() is not supported on this node')
  const nodes: SceneNode[] = [root]
  const collect = (node: SceneNode): void => {
    for (const childId of node.childIds) {
      const child = graph.getNode(childId)
      if (!child) continue
      nodes.push(child)
      collect(child)
    }
  }
  collect(root)
  for (const node of nodes) {
    graph.updateNode(node.id, rescaleNodeChanges(graph, node, scale, node.id !== rootId))
  }
}
