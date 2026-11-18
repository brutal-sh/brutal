import type { Canvas, Image } from 'canvaskit-wasm'

import { type SceneNode, type SceneGraph } from '@open-pencil/scene-graph'
import { arrowCapOverflow } from '@open-pencil/scene-graph/arrow-caps'

import { drawVectorMultiStyleFills } from '#core/canvas/fills'
import type { SkiaRenderer } from '#core/canvas/renderer'
import {
  canCacheEffectRaster,
  effectRasterScale,
  effectRasterScaleMatches,
  type EffectRasterCacheEntry
} from '#core/canvas/renderer/effect-raster-cache'
import { forVisibleStrokes, drawVisibleFills } from '#core/canvas/scene/paints'
import type { NodePaintContext } from '#core/canvas/scene/types'
import { isolatesInnerShadows } from '#core/canvas/shadows'
import { isLayerContainer } from '#core/canvas/shadows/silhouette'
import { isPathTextWithStrokeGeometry, paintNodeStrokes } from '#core/canvas/strokes/paint'
import { vectorStrokePaths } from '#core/canvas/strokes/vector'
import { drawReflowedPathTextSilhouettes, isReflowedPathText } from '#core/canvas/text/derived'
import { drawNoteFill } from '#core/canvas/text/notes'
import { drawTextEmoji } from '#core/canvas/text/renderer'
/** The effects `renderShape` draws: a container's shadows are drawn around its children instead. */
function shapeEffects(node: SceneNode): SceneNode['effects'] {
  const ownShadows = !isLayerContainer(node)
  return node.effects.filter(
    (effect) =>
      effect.visible &&
      (ownShadows || (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW'))
  )
}

function canRasterCacheEffects(node: SceneNode): boolean {
  const visibleEffects = shapeEffects(node)
  return (
    visibleEffects.length > 0 &&
    visibleEffects.every(
      (effect) => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
    )
  )
}

function drawCachedRaster(
  context: NodePaintContext,
  canRasterCache: boolean,
  targetScale: number
): boolean {
  const { r, canvas, node } = context
  const cachedRaster = canRasterCache ? r.effectRasterCache.get(node.id) : null
  if (
    cachedRaster &&
    (cachedRaster.fontGeneration !== r.fontGeneration ||
      !effectRasterScaleMatches(cachedRaster.scale, targetScale))
  ) {
    r.effectRasterCache.delete(node.id)
  } else if (cachedRaster) {
    canvas.drawImageRectOptions(
      cachedRaster.image,
      r.ck.LTRBRect(0, 0, cachedRaster.image.width(), cachedRaster.image.height()),
      r.ck.LTRBRect(
        cachedRaster.left,
        cachedRaster.top,
        cachedRaster.left + cachedRaster.width,
        cachedRaster.top + cachedRaster.height
      ),
      r.ck.FilterMode.Linear,
      r.ck.MipmapMode.None,
      null
    )
    return true
  }

  return false
}

type RasterFrame = Pick<EffectRasterCacheEntry, 'width' | 'height' | 'scale'> & { margin: number }

function drawEffectSnapshot(context: NodePaintContext, image: Image, frame: RasterFrame): void {
  const { r, canvas, node } = context
  const { width, height, scale, margin } = frame
  const retained = r.effectRasterCache.set(node.id, {
    image,
    left: -margin,
    top: -margin,
    width,
    height,
    scale,
    pixels: image.width() * image.height(),
    fontGeneration: r.fontGeneration
  })
  try {
    canvas.drawImageRectOptions(
      image,
      r.ck.LTRBRect(0, 0, image.width(), image.height()),
      r.ck.LTRBRect(-margin, -margin, node.width + margin, node.height + margin),
      r.ck.FilterMode.Linear,
      r.ck.MipmapMode.None,
      null
    )
  } finally {
    if (!retained) image.delete()
  }
}

function drawEffectRaster(
  context: NodePaintContext,
  target: { canRasterCache: boolean; scale: number; margin: number }
): boolean {
  const { r, node, graph } = context
  const { canRasterCache, scale, margin } = target
  const width = node.width + margin * 2
  const height = node.height + margin * 2
  if (!canRasterCache || !canCacheEffectRaster(width, height, scale)) return false
  const surface = r.surface.makeSurface({
    width: Math.ceil(width * scale),
    height: Math.ceil(height * scale),
    colorType: r.ck.ColorType.RGBA_8888,
    alphaType: r.ck.AlphaType.Premul,
    colorSpace: r.ck.ColorSpace.SRGB
  })
  const rasterCanvas = surface.getCanvas()
  try {
    rasterCanvas.clear(r.ck.TRANSPARENT)
    rasterCanvas.scale(scale, scale)
    rasterCanvas.translate(margin, margin)
    r.renderShapeUncached(rasterCanvas, node, graph)
    surface.flush()
    const image = surface.makeImageSnapshot()
    drawEffectSnapshot(context, image, { width, height, scale, margin })
    return true
  } finally {
    surface.delete()
  }
}

function drawEffectPicture(context: NodePaintContext, margin: number): void {
  const { r, canvas, node, graph } = context
  const cached = r.nodePictureCache.get(node.id)
  const cachedGeneration = r.nodePictureCacheGenerations.get(node.id)
  if (cached && cachedGeneration === r.fontGeneration) {
    canvas.drawPicture(cached)
    return
  }
  if (cached) cached.delete()
  r.nodePictureCache.delete(node.id)
  r.nodePictureCacheGenerations.delete(node.id)

  const bounds = r.ck.LTRBRect(-margin, -margin, node.width + margin, node.height + margin)
  const recorder = new r.ck.PictureRecorder()
  try {
    const recCanvas = recorder.beginRecording(bounds)
    r.renderShapeUncached(recCanvas, node, graph)
    const picture = recorder.finishRecordingAsPicture()
    r.nodePictureCache.set(node.id, picture)
    r.nodePictureCacheGenerations.set(node.id, r.fontGeneration)
    canvas.drawPicture(picture)
  } finally {
    recorder.delete()
  }
}

export function renderShape(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  graph: SceneGraph
): void {
  const hasEffects = shapeEffects(node).length > 0
  if (r.viewportImageRendering || !hasEffects) {
    r.renderShapeUncached(canvas, node, graph)
    return
  }
  const context = { r, canvas, node, graph }
  const canRasterCache = r.renderingSceneBacking && canRasterCacheEffects(node)
  const scale = effectRasterScale(r.zoom * r.dpr)
  if (drawCachedRaster(context, canRasterCache, scale)) return
  const margin = Math.max(
    r.effectOverflow(node),
    arrowCapOverflow(node.strokes, node.strokeCap, node.vectorNetwork)
  )
  if (drawEffectRaster(context, { canRasterCache, scale, margin })) return
  drawEffectPicture(context, margin)
}

/** Draws a shape with its own effects: Figma puts inner shadows over fills and under strokes. */
export function renderShapeUncached(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  graph: SceneGraph
): void {
  r.renderEffects(canvas, node, graph, 'behind')
  paintShapeContent(r, canvas, node, graph, () => r.renderEffects(canvas, node, graph, 'inner'))
  r.renderEffects(canvas, node, graph, 'front')
}

function paintShapeFills(context: NodePaintContext, afterFills?: () => void): void {
  const { r, canvas, node, graph } = context
  const isolated = afterFills !== undefined && isolatesInnerShadows(node)
  if (isolated) canvas.saveLayer()
  if (!drawVectorMultiStyleFills(r, canvas, node, graph)) {
    drawVisibleFills(r, node, graph, (fill) => {
      if (!drawNoteFill(context, fill)) r.drawNodeFill(canvas, node, fill)
    })
  }
  if (node.type === 'TEXT') drawTextEmoji(r, canvas, node)
  afterFills?.()
  if (isolated) canvas.restore()
}

/** Draws a shape's fills and strokes; the renderer keeps its positional callback bridge. */
export function paintShapeContent(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  ...[graph, afterFills]: [graph: SceneGraph, afterFills?: () => void]
): void {
  const context = { r, canvas, node, graph }
  const paths = {
    saved: node.strokeGeometry.length > 0 ? r.getStrokeGeometry(node) : null,
    vector: node.type === 'VECTOR' ? r.getVectorPaths(node) : null,
    runs: node.type === 'VECTOR' ? vectorStrokePaths(r, node) : null
  }
  const pathTextStrokeFirst = isPathTextWithStrokeGeometry(node)
  const reflowedPathText = isReflowedPathText(node)
  if (pathTextStrokeFirst) paintNodeStrokes(context, paths)
  if (reflowedPathText) {
    forVisibleStrokes(r, node, graph, (stroke, color) =>
      drawReflowedPathTextSilhouettes(r, canvas, node, stroke, color)
    )
  }
  paintShapeFills(context, afterFills)
  if (!pathTextStrokeFirst && !reflowedPathText) paintNodeStrokes(context, paths)
}
