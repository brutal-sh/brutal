import type { Canvas } from 'canvaskit-wasm'

import { type SceneNode, type SceneGraph } from '@open-pencil/scene-graph'
import type { VisualBounds } from '@open-pencil/scene-graph/geometry'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Vector } from '@open-pencil/scene-graph/primitives'
import { textLinesOverflow } from '@open-pencil/scene-graph/text'

import type { SkiaRenderer, RenderOverlays } from '#core/canvas/renderer'
import { mapVisualBounds, subtreeVisualBounds } from '#core/canvas/renderer/visual-bounds'
import { createSceneGeometry, nodeOrientationMatrix, projectedNode } from '#core/geometry'
export function hasNodeTransform(node: SceneNode): boolean {
  return node.rotation !== 0 || node.flipX || node.flipY
}

function hasOverflowPathTextPaint(node: SceneNode): boolean {
  return (
    node.textPathData != null &&
    ((node.derivedTextGlyphs?.length ?? 0) > 0 ||
      (Array.isArray(node.strokeGeometry) && node.strokeGeometry.length > 0))
  )
}

interface CullPlacement extends Vector {
  hasTransformedAncestor: boolean
  preview?: RenderOverlays['rotationPreview']
}

function canCull(node: SceneNode): boolean {
  return (
    node.childIds.length === 0 ||
    ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
      node.clipsContent)
  )
}

function outsideViewport(viewport: SkiaRenderer['worldViewport'], bounds: VisualBounds): boolean {
  return (
    bounds.minX > viewport.x + viewport.w ||
    bounds.minY > viewport.y + viewport.h ||
    bounds.maxX < viewport.x ||
    bounds.maxY < viewport.y
  )
}

function transformedOutside(
  r: SkiaRenderer,
  graph: SceneGraph,
  node: SceneNode,
  preview: RenderOverlays['rotationPreview']
): boolean {
  const bounds = createSceneGeometry(graph, preview).bounds(node)
  return outsideViewport(r.worldViewport, {
    minX: bounds.x,
    minY: bounds.y,
    maxX: bounds.x + bounds.width,
    maxY: bounds.y + bounds.height
  })
}

function rotatedOutside(
  r: SkiaRenderer,
  graph: SceneGraph,
  node: SceneNode,
  bounds: { width: number; height: number; preview?: RenderOverlays['rotationPreview'] }
): boolean {
  const diag = Math.hypot(bounds.width, bounds.height)
  const { x: cx, y: cy } = createSceneGeometry(graph, bounds.preview).toWorld(node, {
    x: bounds.width / 2,
    y: bounds.height / 2
  })
  return outsideViewport(r.worldViewport, {
    minX: cx - diag / 2,
    minY: cy - diag / 2,
    maxX: cx + diag / 2,
    maxY: cy + diag / 2
  })
}

export function isCulled(
  r: SkiaRenderer,
  graph: SceneGraph,
  node: SceneNode,
  placement: CullPlacement
): boolean {
  if (!canCull(node) || hasOverflowPathTextPaint(node)) return false
  // Text lines past a fixed-size box still draw, as in Figma.
  const linesOverflow = textLinesOverflow(node)
  if (placement.hasTransformedAncestor) {
    if (linesOverflow > 0) return false
    return transformedOutside(r, graph, node, placement.preview)
  }
  const bw = node.width
  const bh = node.height + linesOverflow
  if (projectedNode(node, placement.preview).rotation !== 0) {
    return rotatedOutside(r, graph, node, { width: bw, height: bh, preview: placement.preview })
  }
  return outsideViewport(r.worldViewport, {
    minX: placement.x,
    minY: placement.y,
    maxX: placement.x + bw,
    maxY: placement.y + bh
  })
}

export function applyNodeTransforms(
  canvas: Canvas,
  node: SceneNode,
  overlays: RenderOverlays
): void {
  canvas.concat(nodeOrientationMatrix(node, overlays.rotationPreview))
}

export function viewportLayerBounds(
  r: SkiaRenderer,
  graph: SceneGraph,
  node: SceneNode,
  options: { padding: number; preview?: RenderOverlays['rotationPreview'] }
): Float32Array | null {
  const { padding, preview } = options
  if (!r.boundEffectLayersToViewport) return null
  const inverse = Matrix.invert(createSceneGeometry(graph, preview).worldMatrix(node))
  if (!inverse) return null
  const viewport = r.worldViewport
  const bounds = mapVisualBounds(inverse, {
    minX: viewport.x,
    minY: viewport.y,
    maxX: viewport.x + viewport.w,
    maxY: viewport.y + viewport.h
  })
  return r.ck.LTRBRect(
    bounds.minX - padding,
    bounds.minY - padding,
    bounds.maxX + padding,
    bounds.maxY + padding
  )
}

/**
 * The layer opens after the node's x/y translation and before its rotation and flips, so the
 * subtree is measured through its orientation matrix.
 */
export function nodeIsolationLayerBounds(
  r: SkiaRenderer,
  graph: SceneGraph,
  node: SceneNode,
  preview?: RenderOverlays['rotationPreview']
): Float32Array {
  const viewportBounds = viewportLayerBounds(r, graph, node, { padding: 0, preview })
  if (viewportBounds) return viewportBounds
  const bounds = subtreeVisualBounds(graph, node, nodeOrientationMatrix(node, preview), preview)
  return r.ck.LTRBRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
}
