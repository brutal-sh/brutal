import * as v from 'valibot'

import { isLegacyStroke, mapBlendMode } from '../paints'
import { penMeshPaintSchema, penShaderPaintSchema } from '../schema'
import type { PenOverride, PenPaint, PenPaints } from '../schema'
import type { DiagnosticReporter, NodeLocation } from './diagnostics'

const GRADIENT_TYPES = new Set(['linear', 'radial', 'angular'])
const EFFECT_TYPES = new Set(['blur', 'background_blur', 'shadow'])

function inspectBlend(
  value: string | undefined,
  path: string,
  nodeId: string | undefined,
  add: DiagnosticReporter
) {
  if (value !== undefined && typeof mapBlendMode(value) !== 'string')
    add('unsupported-blend', path, `Blend mode ${value} would be replaced with normal.`, nodeId)
}

function supportedPaint(paint: Exclude<PenPaint, string>): boolean {
  switch (paint.type) {
    case 'color':
    case 'image':
      return true
    case 'shader':
      return v.safeParse(penShaderPaintSchema, paint).success
    case 'mesh_gradient':
      return v.safeParse(penMeshPaintSchema, paint).success
    case 'gradient': {
      const gradientType = paint.gradientType ?? 'linear'
      return typeof gradientType === 'string' && GRADIENT_TYPES.has(gradientType)
    }
    default:
      return false
  }
}

function inspectPaints(
  value: PenPaints | undefined,
  path: string,
  nodeId: string | undefined,
  add: DiagnosticReporter
) {
  if (value === undefined) return
  const list = Array.isArray(value) ? value : [value]
  list.forEach((paint, index) => {
    if (typeof paint === 'string') return
    const at = Array.isArray(value) ? `${path}/${index}` : path
    if (!supportedPaint(paint))
      add(
        'unsupported-paint',
        at,
        `Paint ${paint.type} would be omitted or cannot be rendered.`,
        nodeId
      )
    inspectBlend(paint.blendMode, `${at}/blendMode`, nodeId, add)
  })
}

export function inspectGraphics(
  node: PenOverride,
  location: Pick<NodeLocation, 'path' | 'nodeId'>,
  add: DiagnosticReporter
) {
  const { path, nodeId } = location
  inspectPaints(node.fill, `${path}/fill`, nodeId, add)
  const stroke = node.stroke
  if (isLegacyStroke(stroke)) inspectPaints(stroke.fill, `${path}/stroke/fill`, nodeId, add)
  else inspectPaints(stroke, `${path}/stroke`, nodeId, add)
  const effects = Array.isArray(node.effect)
    ? node.effect
    : [node.effect].filter((effect) => effect !== undefined)
  effects.forEach((effect, index) => {
    const at = Array.isArray(node.effect) ? `${path}/effect/${index}` : `${path}/effect`
    if (!EFFECT_TYPES.has(effect.type))
      add('unsupported-effect', at, `Effect ${effect.type} would be omitted.`, nodeId)
    inspectBlend(effect.blendMode, `${at}/blendMode`, nodeId, add)
  })
}
