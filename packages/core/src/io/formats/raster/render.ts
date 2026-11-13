import type { CanvasKit } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { RenderColorSpace } from '@open-pencil/scene-graph/color'
import { getWorldMatrix } from '@open-pencil/scene-graph/coordinate'
import { computeDescendantVisualBounds, type VisualBounds } from '@open-pencil/scene-graph/geometry'
import type { Mat3 } from '@open-pencil/scene-graph/matrix'
import { assertScriptOutputs } from '@open-pencil/scene-graph/scripts'
import { assertFragmentFrames } from '@open-pencil/scene-graph/shaders'

import type { SkiaRenderer } from '#core/canvas'
import { getPageColor } from '#core/figma-api/page-backgrounds'
import { extractExportGraph, findPageId } from '#core/io/subgraph'

import { renderToSurface } from './surface'

type RenderContextArgs = [ck: CanvasKit, renderer: SkiaRenderer, graph: SceneGraph, pageId: string]

export type RasterExportFormat = 'PNG' | 'JPG' | 'WEBP'
export type ExportFormat = RasterExportFormat | 'SVG'

interface RenderOptions {
  scale: number
  format: ExportFormat
  quality?: number
  colorSpace?: RenderColorSpace
  trimTransparent?: boolean
}

function ensureSinglePageSelection(graph: SceneGraph, pageId: string, nodeIds: string[]): boolean {
  return nodeIds.every((nodeId) => findPageId(graph, nodeId) === pageId)
}

function nodeNeedsSceneBackdrop(graph: SceneGraph, nodeId: string): boolean {
  const node = graph.getNode(nodeId)
  if (!node) return false
  if (node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH') return true
  if (node.effects.some((effect) => effect.visible && effect.type === 'BACKGROUND_BLUR')) {
    return true
  }
  return node.childIds.some((childId) => nodeNeedsSceneBackdrop(graph, childId))
}

export function computeContentBounds(graph: SceneGraph, nodeIds: string[]) {
  return computeDescendantVisualBounds(
    nodeIds,
    (id) => graph.getNode(id),
    (id) => graph.getAbsolutePosition(id)
  )
}

export function prepareSelectionRenderGraph(
  source: SceneGraph,
  renderGraph: SceneGraph,
  pageId: string,
  nodeIds: string[]
): void {
  const page = renderGraph.getNode(pageId)
  if (!page) return

  page.childIds = nodeIds.filter((nodeId) => renderGraph.getNode(nodeId) !== undefined)
  for (const nodeId of page.childIds) {
    const node = renderGraph.getNode(nodeId)
    const sourceNode = source.getNode(nodeId)
    if (!node || !sourceNode) continue
    if (sourceNode.parentId === pageId) continue
    const world = getWorldMatrix(sourceNode, source)
    node.parentId = pageId
    applyWorldTransform(node, world)
  }
  renderGraph.clearAbsPosCache()
}

function applyWorldTransform(node: SceneNode, matrix: Mat3): void {
  const determinant = matrix[0] * matrix[4] - matrix[1] * matrix[3]
  const flipX = determinant < 0
  const rotation = Math.atan2(matrix[3], flipX ? matrix[4] : matrix[0])
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const centerX = node.width / 2
  const centerY = node.height / 2
  const m00 = flipX ? -cos : cos
  const m01 = flipX ? sin : -sin
  const m10 = sin
  const m11 = cos

  node.x = matrix[2] - centerX + m00 * centerX + m01 * centerY
  node.y = matrix[5] - centerY + m10 * centerX + m11 * centerY
  node.rotation = rotation * (180 / Math.PI)
  node.flipX = flipX
  node.flipY = false
}

function renderSelection(graph: SceneGraph, pageId: string, nodeIds: string[]) {
  const extracted = extractExportGraph(graph, { scope: 'selection', nodeIds })
  if (!extracted.pageId) return null

  const renderGraph = nodeIds.some((nodeId) => nodeNeedsSceneBackdrop(graph, nodeId))
    ? graph
    : extracted.graph
  const renderPageId = renderGraph === graph ? pageId : extracted.pageId
  if (renderGraph !== graph) {
    prepareSelectionRenderGraph(graph, renderGraph, renderPageId, nodeIds)
  }

  return { graph: renderGraph, pageId: renderPageId }
}

export function renderNodesToImage(
  ...[ck, renderer, graph, pageId, nodeIds, options]: [
    ...RenderContextArgs,
    nodeIds: string[],
    options: RenderOptions
  ]
): Uint8Array<ArrayBuffer> | null {
  if (!ensureSinglePageSelection(graph, pageId, nodeIds)) {
    throw new Error('Raster export selection must stay on a single page')
  }
  assertScriptOutputs(graph, nodeIds)
  assertFragmentFrames(graph, nodeIds)

  const bounds = computeContentBounds(graph, nodeIds)
  if (!bounds) return null

  const contentW = bounds.maxX - bounds.minX
  const contentH = bounds.maxY - bounds.minY
  if (contentW <= 0 || contentH <= 0) return null

  const pixelW = Math.ceil(contentW * options.scale)
  const pixelH = Math.ceil(contentH * options.scale)
  if (pixelW <= 0 || pixelH <= 0) return null

  const target = renderSelection(graph, pageId, nodeIds)
  if (!target) return null

  const quality = options.quality ?? (options.format === 'PNG' ? 100 : 90)
  return renderToSurface(ck, renderer, {
    graph: target.graph,
    pageId: target.pageId,
    width: pixelW,
    height: pixelH,
    format: options.format,
    quality,
    setup(canvas) {
      canvas.clear(ck.TRANSPARENT)
      canvas.scale(options.scale, options.scale)
      canvas.translate(-bounds.minX, -bounds.minY)
    },
    trimTransparent: options.trimTransparent
  })
}

export interface ThumbnailFrame {
  /** The page content the thumbnail shows. */
  bounds: VisualBounds
  scale: number
  /** The thumbnail's size in pixels. */
  width: number
  height: number
}

/** The page region a thumbnail fitted into `width` by `height` pixels shows, and its size. */
export function thumbnailFrame(
  graph: SceneGraph,
  pageId: string,
  width: number,
  height: number
): ThumbnailFrame | null {
  const page = graph.getNode(pageId)
  if (!page || page.childIds.length === 0) return null

  const bounds = computeContentBounds(graph, page.childIds)
  if (!bounds) return null

  const contentW = bounds.maxX - bounds.minX
  const contentH = bounds.maxY - bounds.minY
  if (contentW <= 0 || contentH <= 0) return null

  const scale = Math.min(width / contentW, height / contentH)
  return {
    bounds,
    scale,
    width: Math.max(1, Math.round(contentW * scale)),
    height: Math.max(1, Math.round(contentH * scale))
  }
}

export function renderThumbnail(
  ...[ck, renderer, graph, pageId, width, height]: [
    ...RenderContextArgs,
    width: number,
    height: number
  ]
): Uint8Array<ArrayBuffer> | null {
  const frame = thumbnailFrame(graph, pageId, width, height)
  if (!frame) return null
  const { bounds, scale, width: pixelW, height: pixelH } = frame
  // The page's own background, which the editor's page colour matches only while it is open.
  const background = getPageColor(graph.getNode(pageId))

  return renderToSurface(ck, renderer, {
    graph,
    pageId,
    width: pixelW,
    height: pixelH,
    format: 'PNG',
    quality: 100,
    setup(canvas) {
      canvas.clear(ck.Color4f(background.r, background.g, background.b, 1))
      canvas.translate(-bounds.minX * scale, -bounds.minY * scale)
      canvas.scale(scale, scale)
    }
  })
}

/** Draws a page region with `renderer`; `region.ts` gives it a renderer of its own. */
export function drawRegionToImage(
  ...[ck, renderer, graph, pageId, bounds, scale]: [
    ...RenderContextArgs,
    bounds: VisualBounds,
    scale: number
  ]
): Uint8Array<ArrayBuffer> | null {
  const pixelW = Math.max(1, Math.round((bounds.maxX - bounds.minX) * scale))
  const pixelH = Math.max(1, Math.round((bounds.maxY - bounds.minY) * scale))
  if (!graph.getNode(pageId) || !Number.isFinite(pixelW * pixelH)) return null
  return renderToSurface(ck, renderer, {
    graph,
    pageId,
    width: pixelW,
    height: pixelH,
    format: 'PNG',
    quality: 100,
    setup(canvas) {
      canvas.clear(ck.Color4f(renderer.pageColor.r, renderer.pageColor.g, renderer.pageColor.b, 1))
      canvas.scale(scale, scale)
      canvas.translate(-bounds.minX, -bounds.minY)
    }
  })
}

// Preserve callable metadata for the existing positional APIs.
for (const render of [renderNodesToImage, renderThumbnail, drawRegionToImage]) {
  Object.defineProperty(render, 'length', { value: 6 })
}
