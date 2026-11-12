import type { Canvas, Path } from 'canvaskit-wasm'

import { type SceneNode } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { getStrokeCapEntity, getStrokeJoinEntity, normalizeDashPattern } from '#core/canvas/strokes'
import { addStrokeRunToPath, strokeRuns } from '#core/vector'

import type { StrokePaintInput } from './types'

interface VectorStrokePaint extends StrokePaintInput {
  paths: Path[]
  miterLimit: number
  outlineCacheKey?: string
}

type PathStrokeOptions = Parameters<Path['makeStroked']>[0]
export function drawVectorStrokeGeometry(
  r: SkiaRenderer,
  canvas: Canvas,
  paint: { paths: Path[]; color: Color; opacity: number }
): void {
  const { paths: sg, color: sc, opacity } = paint
  r.fillPaint.setColor(r.ck.Color4f(sc.r, sc.g, sc.b, sc.a))
  r.fillPaint.setAlphaf(opacity)
  for (const p of sg) canvas.drawPath(p, r.fillPaint)
}

export function vectorStrokePaths(r: SkiaRenderer, node: SceneNode): Path[] | null {
  if (!node.vectorNetwork) return null
  const cached = r.nodePaths.vectorStroke.get(node.id)
  if (cached) return cached

  // A path per run, so the corners inside a run join and only its open ends take caps.
  const { segments, vertices } = node.vectorNetwork
  const paths = strokeRuns(segments).map((run) => {
    const path = new r.ck.PathBuilder()
    addStrokeRunToPath(path, run, segments, vertices)
    return path.detachAndDelete()
  })

  if (paths.length === 0) return null
  r.nodePaths.store(r.nodePaths.vectorStroke, node.id, paths)
  return paths
}

/** Stroke outlines are cached under `<nodeId>|…`, which `NodePathCaches.invalidate` removes. */
export function strokeOutlineKey(
  node: SceneNode,
  stroke: SceneNode['strokes'][0],
  source: 'runs' | 'regions' | 'closed' | 'open'
): string {
  return `${node.id}|${source}|${stroke.weight}|${stroke.cap ?? node.strokeCap}|${stroke.join ?? node.strokeJoin}|${node.strokeMiterLimit}`
}

function drawVectorDashes(
  r: SkiaRenderer,
  canvas: Canvas,
  paint: VectorStrokePaint,
  dash: number[]
): void {
  const { paths, stroke, color, miterLimit } = paint
  r.strokePaint.setColor(r.ck.Color4f(color.r, color.g, color.b, color.a))
  r.strokePaint.setAlphaf(stroke.opacity)
  r.strokePaint.setStrokeWidth(stroke.weight)
  r.strokePaint.setStrokeCap(getStrokeCapEntity(r, stroke.cap ?? 'NONE'))
  r.strokePaint.setStrokeJoin(getStrokeJoinEntity(r, stroke.join ?? 'MITER'))
  r.strokePaint.setStrokeMiter(miterLimit)
  const effect = r.ck.PathEffect.MakeDash(dash, 0)
  r.strokePaint.setPathEffect(effect)
  for (const path of paths) canvas.drawPath(path, r.strokePaint)
  r.strokePaint.setPathEffect(null)
  effect.delete()
}

function pathStrokeOptions(r: SkiaRenderer, paint: VectorStrokePaint): PathStrokeOptions {
  return {
    width: paint.stroke.weight,
    miter_limit: paint.miterLimit,
    cap: getStrokeCapEntity(r, paint.stroke.cap ?? 'NONE'),
    join: getStrokeJoinEntity(r, paint.stroke.join ?? 'MITER')
  }
}

function makeStrokeOutlines(paths: Path[], options: PathStrokeOptions): Path[] {
  const outlines: Path[] = []
  for (const path of paths) {
    const outline = path.makeStroked(options)
    if (outline) outlines.push(outline)
  }
  return outlines
}

export function drawVectorPathStrokes(
  r: SkiaRenderer,
  canvas: Canvas,
  paint: VectorStrokePaint
): void {
  const { paths, stroke, color, outlineCacheKey } = paint
  const dash = normalizeDashPattern(stroke.dashPattern)
  if (dash.length > 0) {
    drawVectorDashes(r, canvas, paint, dash)
    return
  }
  const strokeOpts = pathStrokeOptions(r, paint)
  r.fillPaint.setColor(r.ck.Color4f(color.r, color.g, color.b, color.a))
  r.fillPaint.setAlphaf(stroke.opacity)
  const cached = outlineCacheKey ? r.nodePaths.strokeOutline.get(outlineCacheKey) : undefined
  if (cached) {
    for (const outline of cached) canvas.drawPath(outline, r.fillPaint)
    return
  }
  const outlines = makeStrokeOutlines(paths, strokeOpts)
  for (const outline of outlines) canvas.drawPath(outline, r.fillPaint)
  // Drawing copies the outline, so one without a cache key is done with here.
  if (outlineCacheKey) r.nodePaths.store(r.nodePaths.strokeOutline, outlineCacheKey, outlines)
  else for (const outline of outlines) outline.delete()
}

/**
 * Strokes a vector's paths on the side its alignment takes, as a shape's stroke is: a centred
 * stroke twice as wide, kept inside its closed regions for `INSIDE` and outside them for
 * `OUTSIDE`. Open segments enclose nothing to take a side of, so they stroke centred.
 */
export function drawAlignedVectorPathStrokes(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  paint: Pick<VectorStrokePaint, 'paths' | 'stroke' | 'color'>
): void {
  const { paths: vectorPaths, stroke, color: sc } = paint
  const miter = node.strokeMiterLimit
  // `vectorNetworkToPath` lists a path for each region, then one for the open segments.
  const regions = node.vectorNetwork?.regions.length ?? 0
  const closed = vectorPaths.slice(0, regions)
  // The inside of the regions, which an inside stroke keeps to; a union that fails strokes centred.
  const inside = stroke.align === 'INSIDE' && closed.length > 0 ? unitePaths(r, closed) : null
  const sided = stroke.align === 'OUTSIDE' ? closed.length > 0 : !!inside
  if (!sided) {
    const outlineKey = strokeOutlineKey(node, stroke, 'regions')
    drawVectorPathStrokes(r, canvas, {
      paths: vectorPaths,
      stroke,
      color: sc,
      miterLimit: miter,
      outlineCacheKey: outlineKey
    })
    return
  }
  const doubled = { ...stroke, weight: stroke.weight * 2 }
  canvas.save()
  if (inside) {
    canvas.clipPath(inside, r.ck.ClipOp.Intersect, true)
    inside.delete()
  } else {
    for (const path of closed) canvas.clipPath(path, r.ck.ClipOp.Difference, true)
  }
  drawVectorPathStrokes(r, canvas, {
    paths: closed,
    stroke: doubled,
    color: sc,
    miterLimit: miter,
    outlineCacheKey: strokeOutlineKey(node, doubled, 'closed')
  })
  canvas.restore()
  const open = vectorPaths.slice(regions)
  if (open.length > 0)
    drawVectorPathStrokes(r, canvas, {
      paths: open,
      stroke,
      color: sc,
      miterLimit: miter,
      outlineCacheKey: strokeOutlineKey(node, stroke, 'open')
    })
}

/** One path covering every path given, which a clip can keep the inside of. */
function unitePaths(r: SkiaRenderer, paths: Path[]): Path | null {
  let united: Path | null = paths[0]?.copy() ?? null
  for (const path of paths.slice(1)) {
    if (!united) break
    const next = r.ck.Path.MakeFromOp(united, path, r.ck.PathOp.Union)
    united.delete()
    united = next
  }
  return united
}
