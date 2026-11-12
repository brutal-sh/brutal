import type { SceneNode as CoreSceneNode } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas'
import { booleanOperationPaints, createBooleanOperation } from '#core/editor/structure/boolean'
import { wrapNodes } from '#core/editor/structure/container-wrap'
import { ungroupNode } from '#core/editor/structure/group/ungroup'

import { componentFromNode } from './components'
import { flattenSceneNodes } from './flatten'
import type { FigmaAPI } from './index'
import type {
  FigmaBooleanOperationNode,
  FigmaComponentNode,
  FigmaComponentSetNode,
  FigmaGroupNode,
  FigmaVectorNode
} from './node-types'
import { INTERNAL_ID, type FigmaNodeProxy } from './proxy'
import { combineComponentsAsVariants } from './variants'

export type NodeInputs = ReadonlyArray<BaseNode | FigmaNodeProxy>
export type NodeParent = (BaseNode & ChildrenMixin) | FigmaNodeProxy

export function nodeId(node: BaseNode | FigmaNodeProxy): string {
  return (node as BaseNode & { [INTERNAL_ID]: string })[INTERNAL_ID]
}

export function rawNode(api: FigmaAPI, node: BaseNode | FigmaNodeProxy): CoreSceneNode {
  const id = nodeId(node)
  const raw = api.graph.getNode(id)
  if (!raw) throw new Error(`Node ${id} not found`)
  return raw
}

export function groupNodes(
  api: FigmaAPI,
  nodes: NodeInputs,
  parent: NodeParent,
  index?: number
): FigmaGroupNode {
  const parentId = nodeId(parent)
  const members = nodes.map((node) => rawNode(api, node))
  const groupNode = wrapNodes(api.graph, 'GROUP', members, parentId, index)
  return api.wrapNode(groupNode.id) as FigmaGroupNode
}

export function ungroup(
  api: FigmaAPI,
  node: (SceneNode & ChildrenMixin) | FigmaNodeProxy
): Array<SceneNode> | FigmaNodeProxy[] {
  const children = ungroupNode(api.graph, nodeId(node)) ?? []
  return children.map((id) => api.wrapNode(id))
}

export function createComponent(api: FigmaAPI, node: FigmaNodeProxy): FigmaNodeProxy {
  const raw = api.graph.getNode(node[INTERNAL_ID])
  if (!raw) throw new Error('Node not found')
  return api.wrapNode(componentFromNode(api.graph, raw, raw.parentId ?? api.currentPageId).id)
}

export function combineVariants(
  api: FigmaAPI,
  nodes: ReadonlyArray<ComponentNode | FigmaComponentNode>,
  parent: NodeParent,
  index?: number
): FigmaComponentSetNode {
  const componentSet = combineComponentsAsVariants(
    api.graph,
    nodes.map((node) => nodeId(node)),
    nodeId(parent),
    index
  )
  return api.wrapNode(componentSet.id) as FigmaComponentSetNode
}

export function booleanOperation(
  api: FigmaAPI,
  operation: 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE',
  nodes: NodeInputs,
  target: { parent: NodeParent; index?: number }
): FigmaBooleanOperationNode {
  const { parent, index } = target
  if (nodes.length < 2) throw new Error('Need at least 2 nodes for boolean operation')
  const parentId = nodeId(parent)
  const members = nodes.map((node) => rawNode(api, node))
  const { node: group } = createBooleanOperation(
    api.graph,
    members,
    parentId,
    operation,
    index,
    booleanOperationPaints(operation, members, 'script'),
    api.groupFitOptions
  )
  return api.wrapNode(group.id) as FigmaBooleanOperationNode
}

export function flatten(
  api: FigmaAPI,
  renderer: SkiaRenderer | null,
  nodes: NodeInputs,
  target: { parent?: NodeParent; index?: number }
): FigmaVectorNode {
  const { parent, index } = target
  if (nodes.length === 0) throw new Error('Need at least 1 node to flatten')
  const parentId = nodeId(parent ?? api.currentPage)
  const sourceNodes: CoreSceneNode[] = []
  for (const node of nodes) {
    const raw = api.graph.getNode(nodeId(node))
    if (!raw) throw new Error('Node not found')
    sourceNodes.push(raw)
  }
  const vector = flattenSceneNodes(api.graph, renderer, sourceNodes, parentId)
  if (index != null) api.graph.insertChildAt(vector.id, parentId, index)
  for (const node of nodes) {
    api.graph.deleteNode(nodeId(node))
  }
  return api.wrapNode(vector.id) as FigmaVectorNode
}
