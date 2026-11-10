import type { FillType, GradientStop } from '@open-pencil/scene-graph'
import {
  ellipticalGradientTransform,
  linearGradientTransformFromAxes
} from '@open-pencil/scene-graph/gradient'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { PenGradientPaint } from '../schema'
import { resolveColor, resolveNumber, type VarContext } from '../variables'

export const GRADIENT_TYPES: Partial<Record<string, FillType>> = {
  linear: 'GRADIENT_LINEAR',
  radial: 'GRADIENT_RADIAL',
  angular: 'GRADIENT_ANGULAR'
}

/**
 * pen.dev places a gradient in the layer's unit square: `center` defaults to the middle, a linear
 * gradient runs `size.height` long from bottom to top, radial and angular ones are ellipses of
 * diameter `size`, and `rotation` turns all of it counter-clockwise in that square. An angular
 * gradient starts at the top and turns clockwise. Measured against pen.dev 2.21 renders.
 */
export function gradientTransform(paint: PenGradientPaint, type: FillType, ctx: VarContext) {
  const center = { x: paint.center?.x ?? 0.5, y: paint.center?.y ?? 0.5 }
  const width = resolveNumber(paint.size?.width, ctx, 1)
  const height = resolveNumber(paint.size?.height, ctx, 1)
  const angle = (resolveNumber(paint.rotation, ctx) * Math.PI) / 180
  // Up, and right, after turning counter-clockwise on a y-down canvas.
  const up = { x: -Math.sin(angle), y: -Math.cos(angle) }
  const right = { x: Math.cos(angle), y: -Math.sin(angle) }
  const along = (direction: Vector, length: number): Vector => ({
    x: center.x + direction.x * length,
    y: center.y + direction.y * length
  })
  if (type === 'GRADIENT_LINEAR') {
    return linearGradientTransformFromAxes(along(up, -height / 2), along(up, height / 2), {
      x: right.x * height,
      y: right.y * height
    })
  }
  if (type === 'GRADIENT_ANGULAR') {
    return ellipticalGradientTransform(center, along(up, height / 2), along(right, width / 2))
  }
  return ellipticalGradientTransform(center, along(right, width / 2), {
    x: center.x - up.x * (height / 2),
    y: center.y - up.y * (height / 2)
  })
}

export function gradientStops(paint: PenGradientPaint, ctx: VarContext): GradientStop[] {
  return (paint.colors ?? []).map((stop) => ({
    color: resolveColor(stop.color, ctx),
    position: resolveNumber(stop.position, ctx)
  }))
}
