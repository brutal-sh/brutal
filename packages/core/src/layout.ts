import { Direction } from 'yoga-layout'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { connectorSublayers, layoutConnector } from '@open-pencil/scene-graph/connectors'
import { resolveNodeLayoutDirection } from '@open-pencil/scene-graph/text/direction'

import { applyYogaLayout } from './layout/apply'
import { applyEffectiveGeneratedTextLayout } from './layout/effective-generated-text'
import { buildYogaTree } from './layout/flex'
import { buildGridTree } from './layout/grid'
import { layoutNote } from './layout/notes'
import { fitShapeWithTextFrame } from './layout/shape-with-text'
import { sizeAutoResizingText } from './layout/text-auto-resize'
import { freeYogaTree } from './layout/yoga-helpers'
export { sizeAutoResizingText } from './layout/text-auto-resize'
export {
  estimateTextSize,
  getTextMeasurer,
  installTextMeasurer,
  setTextMeasurer,
  type TextMeasurer
} from './layout/text-measurement'

export function computeLayout(graph: SceneGraph, frameId: string): void {
  graph.withLayoutMutations(() => computeLayoutInternal(graph, frameId))
}

function computeLayoutInternal(graph: SceneGraph, frameId: string): void {
  const frame = graph.getNode(frameId)
  if (!frame || layoutNote(graph, frame) || frame.layoutMode === 'NONE') return
  // A shape with text takes its size from its label before laying the label out in it.
  fitShapeWithTextFrame(graph, frame)

  const rootDirection = resolveComputedLayoutDirection(graph, frame)
  const yogaDirection = rootDirection === 'RTL' ? Direction.RTL : Direction.LTR
  const yogaRoot =
    frame.layoutMode === 'GRID'
      ? buildGridTree(graph, frame, rootDirection)
      : buildYogaTree(graph, frame, rootDirection)
  yogaRoot.calculateLayout(undefined, undefined, yogaDirection)
  applyYogaLayout(graph, frame, yogaRoot, computeLayoutInternal)
  freeYogaTree(yogaRoot)
}

function resolveComputedLayoutDirection(
  graph: SceneGraph,
  node: Pick<SceneNode, 'layoutDirection' | 'parentId'>
): 'LTR' | 'RTL' {
  const parent = node.parentId ? graph.getNode(node.parentId) : null
  const inheritedDirection = parent ? resolveComputedLayoutDirection(graph, parent) : 'LTR'
  return resolveNodeLayoutDirection(node, inheritedDirection)
}

export function computeAllLayouts(graph: SceneGraph, scopeId?: string): void {
  graph.withLayoutMutations(() => {
    const rootId = scopeId ?? graph.rootId
    const visited = new Set<string>()
    computeLayoutsBottomUp(graph, rootId, visited)
    if (applyEffectiveGeneratedTextLayout(graph, rootId)) {
      computeLayoutsBottomUp(graph, rootId, new Set())
    }
    routeUnroutedConnectors(graph, rootId)
  })
}

/**
 * Routes each connector that has no route yet, as one read from a file that saved none, once its
 * label is measured, as FigJam routes such a connector when it opens. A saved route is kept.
 */
export function routeUnroutedConnectors(graph: SceneGraph, rootId: string): void {
  for (const { node } of graph.flattenTree(rootId)) {
    if (node.type !== 'CONNECTOR') continue
    const line = connectorSublayers(graph, node)?.line
    if (!line || (line.vectorNetwork?.vertices.length ?? 0) > 0) continue
    sizeAutoResizingText(graph, node.id)
    layoutConnector(graph, node)
  }
}

/**
 * Gives content an author wrote, such as design JSX, HTML, or a `.pen` file, the sizes and
 * positions its layout implies, which the source does not store, measuring its text first.
 * Documents that store their geometry, such as `.fig` files, keep theirs and do not come here.
 */
export function layoutAuthoredNodes(graph: SceneGraph, rootIds: Iterable<string>): void {
  const roots = [...rootIds]
  const pageIds = new Set<string>()
  let outsidePages = false
  for (const id of roots) {
    sizeAutoResizingText(graph, id)
    const page = graph.pageOf(id)
    if (page !== null) pageIds.add(page)
    else outsidePages = true
  }
  const layout = () => {
    if (outsidePages) computeAllLayouts(graph)
    else for (const pageId of pageIds) computeAllLayouts(graph, pageId)
  }
  layout()
  // Layout gives wrapping text its width, which its height follows.
  if (roots.map((id) => sizeAutoResizingText(graph, id, true)).some(Boolean)) layout()
  // Connectors authored with the layers they join route once those layers are in place.
  for (const id of roots) {
    for (const { node } of graph.flattenTree(id)) {
      if (node.type === 'CONNECTOR') layoutConnector(graph, node)
    }
  }
}

function computeLayoutsBottomUp(graph: SceneGraph, nodeId: string, visited: Set<string>): void {
  const node = graph.getNode(nodeId)
  if (!node || visited.has(nodeId)) return
  visited.add(nodeId)

  for (const childId of node.childIds) {
    computeLayoutsBottomUp(graph, childId, visited)
  }

  if (layoutNote(graph, node)) return

  if (node.layoutMode !== 'NONE' && !preservesImportedInstanceLayout(node)) {
    computeLayout(graph, nodeId)
  }
}

function preservesImportedInstanceLayout(node: SceneNode): boolean {
  return node.type === 'INSTANCE' && node.source.format === 'fig'
}
