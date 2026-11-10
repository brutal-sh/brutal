import * as v from 'valibot'

import type {
  BlendMode,
  Fill,
  SceneNode,
  Stroke,
  StrokeCap,
  StrokeJoin
} from '@open-pencil/scene-graph'
import { TRANSPARENT } from '@open-pencil/scene-graph/constants'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'
import {
  createShaderPaint,
  fragmentShaderPreset,
  withShaderPaints
} from '@open-pencil/scene-graph/shaders'

import { imagePaint, type PenImages } from './images'
import { GRADIENT_TYPES, gradientStops, gradientTransform } from './paints/gradient'
import { projectMeshPoint } from './paints/mesh-point'
import { penMeshPaintSchema, penShaderPaintSchema } from './schema'
import type {
  PenGradientPaint,
  PenImagePaint,
  PenLegacyStroke,
  PenNode,
  PenOverride,
  PenPaint,
  PenPaints,
  PenSides
} from './schema'
import {
  bindIfVar,
  resolveBoolean,
  resolveColor,
  resolveNumber,
  type VarContext
} from './variables'

type PaintField = 'fills' | 'strokes'

/**
 * Supported pen.dev blend modes by their serialized names.
 */
const BLEND_MODES: Partial<Record<string, BlendMode>> = {
  normal: 'NORMAL',
  darken: 'DARKEN',
  multiply: 'MULTIPLY',
  colorBurn: 'COLOR_BURN',
  linearBurn: 'LINEAR_BURN',
  light: 'LIGHTEN',
  screen: 'SCREEN',
  colorDodge: 'COLOR_DODGE',
  linearDodge: 'LINEAR_DODGE',
  overlay: 'OVERLAY',
  softLight: 'SOFT_LIGHT',
  hardLight: 'HARD_LIGHT',
  difference: 'DIFFERENCE',
  exclusion: 'EXCLUSION',
  hue: 'HUE',
  saturation: 'SATURATION',
  color: 'COLOR',
  luminosity: 'LUMINOSITY'
}

export function mapBlendMode(value: string | undefined): BlendMode | undefined {
  return value === undefined ? undefined : BLEND_MODES[value]
}

/** The public .pen spelling of a supported native paint blend mode. */
export function penBlendMode(value: BlendMode): string | undefined {
  return Object.entries(BLEND_MODES).find(([, mode]) => mode === value)?.[0]
}

function convertMeshPaint(
  paint: PenPaint,
  ctx: VarContext,
  field: PaintField,
  index: number,
  node?: SceneNode
): Fill | null {
  const parsed = v.safeParse(penMeshPaintSchema, paint)
  if (!parsed.success) return null
  const raw = parsed.output
  const mesh = createMeshGradient(raw.columns ?? 3, raw.rows ?? 3)
  if (raw.colors)
    mesh.colors = raw.colors.map((color, colorIndex) => {
      if (node) bindIfVar(node, `${field}/${index}/meshGradient/colors/${colorIndex}`, color, ctx)
      return resolveColor(color, ctx)
    })
  if (raw.points)
    mesh.points = raw.points.map((point) => {
      if (Array.isArray(point)) return { position: { x: point[0], y: point[1] } }
      const vector = (value: [number, number]) => ({ x: value[0], y: value[1] })
      return projectMeshPoint(point, vector)
    })
  return {
    type: 'GRADIENT_MESH',
    color: { ...TRANSPARENT },
    opacity: resolveNumber(raw.opacity, ctx, 1),
    visible: resolveBoolean(raw.enabled, ctx),
    blendMode: mapBlendMode(raw.blendMode),
    meshGradient: mesh
  }
}

function convertShaderPaint(
  paint: PenPaint,
  ctx: VarContext,
  node: SceneNode | undefined,
  images: PenImages | undefined,
  previous: Fill[]
): Fill | null {
  const parsed = v.safeParse(penShaderPaintSchema, paint)
  if (!parsed.success || !node) return null
  const raw = parsed.output
  const { paint: fill, shader } = createShaderPaint(
    fragmentShaderPreset({
      url: raw.url,
      source: images?.shader(raw.url) ?? raw.openPenSource ?? '',
      uniforms: raw.uniforms ?? {},
      error: raw.openPenShaderError
    })
  )
  node.pluginData = withShaderPaints(
    node,
    [...node.fills, ...node.strokes, ...previous, fill],
    [shader]
  )
  return {
    ...fill,
    opacity: resolveNumber(raw.opacity, ctx, 1),
    visible: resolveBoolean(raw.enabled, ctx),
    blendMode: mapBlendMode(raw.blendMode)
  }
}

function convertImagePaint(
  paint: PenImagePaint,
  ctx: VarContext,
  node: SceneNode | undefined,
  images: PenImages | undefined
): Fill | null {
  const source = paint
  const image = source.url ? images?.get(source.url) : undefined
  if (!image) return null
  const box = { width: node?.width ?? 0, height: node?.height ?? 0 }
  return {
    ...imagePaint(source, image, box, resolveNumber(source.opacity, ctx, 1)),
    visible: resolveBoolean(source.enabled, ctx),
    blendMode: mapBlendMode(source.blendMode)
  }
}

function convertPaint(
  paint: PenPaint,
  index: number,
  field: PaintField,
  ctx: VarContext,
  node: SceneNode | undefined,
  images: PenImages | undefined,
  previous: Fill[]
): Fill | null {
  if (typeof paint === 'string' || paint.type === 'color') {
    const raw = typeof paint === 'string' ? paint : paint.color
    if (typeof raw !== 'string') return null
    const color = resolveColor(raw, ctx)
    if (node) bindIfVar(node, `${field}/${index}/color`, raw, ctx)
    return {
      type: 'SOLID',
      color,
      opacity: color.a,
      visible: typeof paint === 'string' || resolveBoolean(paint.enabled, ctx),
      blendMode: typeof paint === 'string' ? undefined : mapBlendMode(paint.blendMode)
    }
  }
  if (paint.type === 'gradient') {
    const gradient = paint as PenGradientPaint
    const type = GRADIENT_TYPES[gradient.gradientType ?? 'linear']
    if (!type) return null
    return {
      type,
      color: { ...TRANSPARENT },
      opacity: resolveNumber(gradient.opacity, ctx, 1),
      visible: resolveBoolean(gradient.enabled, ctx),
      blendMode: mapBlendMode(gradient.blendMode),
      gradientStops: gradientStops(gradient, ctx),
      gradientTransform: gradientTransform(gradient, type, ctx)
    }
  }
  if (paint.type === 'mesh_gradient') return convertMeshPaint(paint, ctx, field, index, node)
  if (paint.type === 'shader') return convertShaderPaint(paint, ctx, node, images, previous)
  if (paint.type === 'image') return convertImagePaint(paint as PenImagePaint, ctx, node, images)
  return null
}

/** A node's fills, or its strokes' paints, in pen.dev's order: the last one draws on top. */
export function convertPaints(
  paints: PenPaints | undefined,
  field: PaintField,
  ctx: VarContext,
  node?: SceneNode,
  images?: PenImages
): Fill[] {
  if (paints === undefined) return []
  const list = Array.isArray(paints) ? paints : [paints]
  const result: Fill[] = []
  for (const paint of list) {
    const converted = convertPaint(paint, result.length, field, ctx, node, images, result)
    if (converted) result.push(converted)
  }
  return result
}

const ALIGNMENTS: Partial<Record<string, Stroke['align']>> = {
  inner: 'INSIDE',
  inside: 'INSIDE',
  center: 'CENTER',
  outer: 'OUTSIDE',
  outside: 'OUTSIDE'
}

const JOINS: Partial<Record<string, StrokeJoin>> = {
  miter: 'MITER',
  bevel: 'BEVEL',
  round: 'ROUND'
}
const CAPS: Partial<Record<string, StrokeCap>> = { butt: 'NONE', round: 'ROUND', square: 'SQUARE' }

/** The stroke fields of a node, with the 2.8 object form spread into the current ones. */
export interface PenStrokeFields {
  paints: PenPaints | undefined
  width: PenNode['strokeWidth']
  alignment: string | undefined
  cap: string | undefined
  join: string | undefined
}

export function isLegacyStroke(stroke: PenNode['stroke']): stroke is PenLegacyStroke {
  return typeof stroke === 'object' && !Array.isArray(stroke) && 'thickness' in stroke
}

/** A node's stroke fields; an instance's own fields replace its component's one by one. */
export function strokeFields(pen: PenOverride, base?: PenStrokeFields): PenStrokeFields {
  if (isLegacyStroke(pen.stroke)) {
    return {
      paints: pen.stroke.fill,
      width: pen.stroke.thickness,
      alignment: pen.stroke.align,
      cap: pen.stroke.cap,
      join: pen.stroke.join
    }
  }
  return {
    paints: pen.stroke ?? base?.paints,
    width: pen.strokeWidth ?? base?.width,
    alignment: pen.strokeAlignment ?? base?.alignment,
    cap: pen.strokeLinecap ?? base?.cap,
    join: pen.strokeLinejoin ?? base?.join
  }
}

function sideWeights(sides: PenSides, ctx: VarContext) {
  return {
    top: resolveNumber(sides.top, ctx),
    right: resolveNumber(sides.right, ctx),
    bottom: resolveNumber(sides.bottom, ctx),
    left: resolveNumber(sides.left, ctx)
  }
}

/**
 * Sets a node's strokes. pen.dev draws a stroke only with both paints and a width: a missing side
 * of a per-side width is zero, and the alignment defaults to centred.
 */
export function applyStroke(
  node: SceneNode,
  fields: PenStrokeFields,
  ctx: VarContext,
  images?: PenImages
): void {
  node.strokes = []
  node.independentStrokeWeights = false
  if (fields.paints === undefined || fields.width === undefined) return

  let weight: number
  if (typeof fields.width === 'object') {
    const sides = sideWeights(fields.width, ctx)
    weight = Math.max(sides.top, sides.right, sides.bottom, sides.left)
    node.independentStrokeWeights = true
    node.borderTopWeight = sides.top
    node.borderRightWeight = sides.right
    node.borderBottomWeight = sides.bottom
    node.borderLeftWeight = sides.left
  } else {
    weight = resolveNumber(fields.width, ctx)
    bindIfVar(node, 'strokeWeight', fields.width, ctx)
  }
  if (weight <= 0) return

  const align = ALIGNMENTS[fields.alignment ?? 'center'] ?? 'CENTER'
  const cap = CAPS[fields.cap ?? 'butt'] ?? 'NONE'
  const join = JOINS[fields.join ?? 'miter'] ?? 'MITER'
  node.strokeCap = cap
  node.strokeJoin = join
  node.strokes = convertPaints(fields.paints, 'strokes', ctx, node, images).map((paint) => ({
    ...paint,
    weight,
    align,
    cap,
    join,
    dashPattern: []
  }))
}
