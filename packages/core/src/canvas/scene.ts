import type { Canvas } from 'canvaskit-wasm'

import { type SceneNode, type SceneGraph } from '@open-pencil/scene-graph'

import { drawLayoutGrids } from '#core/canvas/layout-grids'
import type { SkiaRenderer, RenderOverlays } from '#core/canvas/renderer'
import { renderNodeContent, renderChildren } from '#core/canvas/scene/content'
import { applyNodeTransforms, isCulled, hasNodeTransform } from '#core/canvas/scene/geometry'
import { beginNodeLayers, finishNodeLayers } from '#core/canvas/scene/layers'
import { renderLayerShadows } from '#core/canvas/shadows'
import { stickyPlaceholderNode } from '#core/canvas/text/placeholder'
import { projectedNode } from '#core/geometry'
import { fontManager } from '#core/text/fonts'
export function renderNodeSelf(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  ...[nodeId, overlays = {}]: [nodeId: string, overlays?: RenderOverlays]
): void {
  const node = graph.getNode(nodeId)
  if (
    !node ||
    node.internalOnly ||
    !node.visible ||
    node.isMask ||
    fontManager.isNodeBlocked(nodeId)
  ) {
    return
  }
  canvas.save()
  canvas.translate(node.x, node.y)
  applyNodeTransforms(canvas, node, overlays)
  renderNodeContent({ r, canvas, graph }, node, overlays)
  drawLayoutGrids(r, canvas, node)
  canvas.restore()
}

/**
 * Whether the canvas draws a node itself: not hidden, a mask, blocked on fonts, drawn live by
 * node-edit mode, or left to a live island while the canvas previews.
 */
function drawsNode(node: SceneNode, overlays: RenderOverlays): boolean {
  if (node.internalOnly || !node.visible || node.isMask || fontManager.isNodeBlocked(node.id))
    return false
  return overlays.nodeEditState?.nodeId !== node.id && !overlays.playIslands?.has(node.id)
}

type RenderNodeArguments = [
  nodeId: string,
  overlays: RenderOverlays,
  parentAbsX?: number,
  parentAbsY?: number,
  hasTransformedAncestor?: boolean
]

export function renderNode(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  ...[
    nodeId,
    overlays,
    parentAbsX = 0,
    parentAbsY = 0,
    hasTransformedAncestor = false
  ]: RenderNodeArguments
): void {
  const found = graph.getNode(nodeId)
  if (!found || !drawsNode(found, overlays)) return
  const node = stickyPlaceholderNode(graph, found, r.stickyPlaceholder) ?? found

  r._nodeCount++

  const position = { x: parentAbsX + node.x, y: parentAbsY + node.y }

  if (
    isCulled(r, graph, node, {
      ...position,
      hasTransformedAncestor,
      preview: overlays.rotationPreview
    })
  ) {
    r._culledCount++
    return
  }

  canvas.save()
  canvas.translate(node.x, node.y)

  const context = { r, canvas, graph }
  const layers = beginNodeLayers(context, node, overlays)

  applyNodeTransforms(canvas, node, overlays)
  renderLayerShadows(r, canvas, graph, node, 'behind')
  renderNodeContent(context, node, overlays)
  drawLayoutGrids(r, canvas, node)
  renderChildren(context, node, overlays, {
    position,
    transformed:
      hasTransformedAncestor || hasNodeTransform(projectedNode(node, overlays.rotationPreview))
  })
  renderLayerShadows(r, canvas, graph, node, 'front')

  finishNodeLayers(context, layers)
  canvas.restore()
}
export { renderSection, renderComponentSet } from '#core/canvas/scene/containers'

export { renderShape, renderShapeUncached, paintShapeContent } from '#core/canvas/scene/shapes'

export { renderText } from '#core/canvas/text/renderer'
