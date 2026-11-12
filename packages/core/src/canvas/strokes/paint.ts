import type { Canvas, Path } from 'canvaskit-wasm'

import { type SceneNode } from '@open-pencil/scene-graph'
import {
  collectArrowEndpoints,
  hasTrimmedShaft,
  trimArrowShafts
} from '@open-pencil/scene-graph/arrow-caps'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { forVisibleStrokes } from '#core/canvas/scene/paints'
import type { NodePaintContext } from '#core/canvas/scene/types'
import { configureStrokePaint, drawArrowHeads, normalizeDashPattern } from '#core/canvas/strokes'
import { drawLineStroke } from '#core/canvas/strokes/line'
import { drawOutlinedDashes } from '#core/canvas/strokes/outlined-dashes'
import {
  drawDashedRectStroke,
  strokeDashesByOutline,
  strokeSideWeights
} from '#core/canvas/strokes/sides'
import {
  strokeOutlineKey,
  drawVectorPathStrokes,
  drawAlignedVectorPathStrokes,
  drawVectorStrokeGeometry
} from '#core/canvas/strokes/vector'
import { vectorNetworkToCenterlinePath, vectorNetworkToPath } from '#core/vector'

import type { NodeStrokePaths, StrokePaintInput } from './types'
/**
 * Draws a dashed stroke on a rectangle, frame, section, or component set with Figma's dash
 * layout, and returns false when the stroke has no dashes or has round or square dash ends on
 * sides of their own weights, which that layout does not cover.
 */
export function drawFigmaDashes(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  stroke: SceneNode['strokes'][0]
): boolean {
  const dash = normalizeDashPattern(stroke.dashPattern)
  if (dash.length === 0) return false
  if (strokeDashesByOutline(node, stroke)) {
    drawDashedRectStroke(r, canvas, node, stroke, strokeSideWeights(node, stroke), dash)
  } else if (node.independentStrokeWeights) {
    return false
  } else {
    drawOutlinedDashes(r, canvas, node, stroke, dash)
  }
  return true
}

function drawRegularStroke(context: NodePaintContext, paint: StrokePaintInput): void {
  const { r, canvas, node } = context
  const { stroke, color } = paint
  configureStrokePaint(r, node, stroke, color)
  const dash = normalizeDashPattern(stroke.dashPattern)
  r.strokePaint.setPathEffect(dash.length > 0 ? r.ck.PathEffect.MakeDash(dash, 0) : null)
  if (node.independentStrokeWeights && r.isRectangularType(node.type)) {
    r.drawIndividualSideStrokes(canvas, node, stroke)
  } else if (!r.isRectangularType(node.type) || !drawFigmaDashes(r, canvas, node, stroke)) {
    r.drawStrokeWithAlign(canvas, node, stroke.align)
  }
}

function drawCenterline(
  context: NodePaintContext,
  paint: StrokePaintInput,
  runs: Path[] | null
): boolean {
  const { r, canvas, node } = context
  const { stroke, color } = paint
  if (
    !(
      runs &&
      stroke.align === 'CENTER' &&
      node.cornerRadius === 0 &&
      node.type === 'VECTOR' &&
      !node.fills.some((fill) => fill.visible)
    )
  )
    return false
  const outlineCacheKey = strokeOutlineKey(node, stroke, 'runs')
  drawVectorPathStrokes(r, canvas, {
    paths: runs,
    stroke,
    color,
    miterLimit: node.strokeMiterLimit,
    outlineCacheKey
  })
  return true
}

function drawSavedGeometry(
  context: NodePaintContext,
  paint: StrokePaintInput,
  saved: Path[]
): void {
  const { r, canvas, node } = context
  const { stroke, color } = paint
  if (stroke.align !== 'INSIDE') {
    if (node.type === 'VECTOR' || node.type === 'TEXT') {
      drawVectorStrokeGeometry(r, canvas, { paths: saved, color, opacity: stroke.opacity })
    } else drawRegularStroke(context, paint)
    return
  }
  const clipPaths = node.type === 'VECTOR' ? r.getFillGeometry(node) : null
  if (node.type === 'VECTOR' && !clipPaths) {
    drawVectorStrokeGeometry(r, canvas, { paths: saved, color, opacity: stroke.opacity })
    return
  }
  canvas.save()
  if (clipPaths) {
    for (const path of clipPaths) canvas.clipPath(path, r.ck.ClipOp.Intersect, true)
  } else r.clipNodeShape(canvas, node)
  drawVectorStrokeGeometry(r, canvas, { paths: saved, color, opacity: stroke.opacity })
  canvas.restore()
}

function drawNodeStroke(
  context: NodePaintContext,
  paint: StrokePaintInput,
  paths: NodeStrokePaths
): void {
  const { r, canvas, node } = context
  if (drawCenterline(context, paint, paths.runs)) return
  if (!paths.saved) {
    if (paths.vector)
      drawAlignedVectorPathStrokes(r, canvas, node, { paths: paths.vector, ...paint })
    else drawRegularStroke(context, paint)
    return
  }
  drawSavedGeometry(context, paint, paths.saved)
}

export function isPathTextWithStrokeGeometry(node: SceneNode): boolean {
  return (
    node.type === 'TEXT' &&
    node.textPathData !== null &&
    (node.derivedTextGlyphs?.length ?? 0) > 0 &&
    node.strokeGeometry.length > 0
  )
}

/** Arrow heads run after their shaft, including dashed, clipped and trimmed branches. */
function drawNodeArrowHeads(context: NodePaintContext, paint: StrokePaintInput): void {
  const { r, canvas, node } = context
  const { stroke, color } = paint
  if (node.type !== 'VECTOR' || !node.vectorNetwork) return
  const endpoints = collectArrowEndpoints(node.vectorNetwork, stroke.cap ?? node.strokeCap)
  if (endpoints.length > 0)
    drawArrowHeads(r, canvas, endpoints, stroke.weight, color, stroke.opacity)
}

function drawDashedVector(context: NodePaintContext, paint: StrokePaintInput): boolean {
  const { r, canvas, node } = context
  const { stroke, color } = paint
  if (
    !(
      stroke.dashPattern &&
      stroke.dashPattern.length > 0 &&
      node.type === 'VECTOR' &&
      node.vectorNetwork
    )
  )
    return false
  const centerline = vectorNetworkToCenterlinePath(r.ck, node.vectorNetwork, node.cornerRadius)
  drawVectorPathStrokes(r, canvas, {
    paths: [centerline],
    stroke,
    color,
    miterLimit: node.strokeMiterLimit
  })
  centerline.delete()
  return true
}

function drawTrimmedVector(
  context: NodePaintContext,
  paint: StrokePaintInput,
  paths: NodeStrokePaths
): boolean {
  const { r, canvas, node } = context
  const { stroke, color } = paint
  const cap = stroke.cap ?? node.strokeCap
  if (
    !(
      !paths.saved &&
      stroke.align === 'CENTER' &&
      node.type === 'VECTOR' &&
      node.vectorNetwork &&
      hasTrimmedShaft(node.vectorNetwork, cap)
    )
  )
    return false
  // Saved stroke geometry is already trimmed; only the live shaft needs its pulled-back copy.
  const network = trimArrowShafts(node.vectorNetwork, cap, stroke.weight)
  const trimmed = vectorNetworkToPath(r.ck, network, node.cornerRadius)
  drawVectorPathStrokes(r, canvas, {
    paths: trimmed,
    stroke,
    color,
    miterLimit: node.strokeMiterLimit
  })
  for (const path of trimmed) path.delete()
  return true
}

export function paintNodeStrokes(context: NodePaintContext, paths: NodeStrokePaths): void {
  const { r, canvas, node, graph } = context
  forVisibleStrokes(r, node, graph, (stroke, color) => {
    const paint = { stroke, color }
    if (node.type === 'LINE') {
      drawLineStroke(r, canvas, node, stroke, color)
      return
    }
    if (drawDashedVector(context, paint) || drawTrimmedVector(context, paint, paths)) {
      drawNodeArrowHeads(context, paint)
      return
    }
    drawNodeStroke(context, paint, paths)
    drawNodeArrowHeads(context, paint)
  })
}
