import { fromUint8Array } from 'js-base64'
import * as v from 'valibot'

import type { Fill, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { colorToHex8 } from '@open-pencil/scene-graph/color'
import {
  IDENTITY_GRADIENT_TRANSFORM,
  invertGradientTransform
} from '@open-pencil/scene-graph/gradient'
import { imageHeader } from '@open-pencil/scene-graph/images'
import { meshGradientSchema } from '@open-pencil/scene-graph/paints'
import type { Vector } from '@open-pencil/scene-graph/primitives'
import { fragmentShaderOf, shaderOfPaint } from '@open-pencil/scene-graph/shaders'

import { penBlendMode } from '../paints'
import { projectMeshPoint } from '../paints/mesh-point'
import type { PenGradientPaint, PenImagePaint, PenMeshPaint, PenPaint } from '../schema'

export type PaintProblem = (path: string, message: string) => void

function gradient(fill: Fill, path: string, problem: PaintProblem): PenGradientPaint | null {
  const transform = fill.gradientTransform ?? IDENTITY_GRADIENT_TRANSFORM
  if (Math.abs(transform.m00 * transform.m11 - transform.m01 * transform.m10) < 1e-12) {
    problem(path, 'A singular gradient transform cannot be represented.')
    return null
  }
  const matrix = invertGradientTransform(transform)
  const center = {
    x: (matrix.m00 + matrix.m01) / 2 + matrix.m02,
    y: (matrix.m10 + matrix.m11) / 2 + matrix.m12
  }
  let width = Math.hypot(matrix.m00, matrix.m10)
  let height = Math.hypot(matrix.m01, matrix.m11)
  let rotation: number
  let gradientType: string
  if (fill.type === 'GRADIENT_LINEAR') {
    // Only the first row determines linear bands; discard the immaterial second-axis skew.
    const squared = transform.m00 ** 2 + transform.m01 ** 2
    height = 1 / Math.sqrt(squared)
    width = height
    rotation = (Math.atan2(-transform.m00, -transform.m01) * 180) / Math.PI
    gradientType = 'linear'
  } else {
    const dot = matrix.m00 * matrix.m01 + matrix.m10 * matrix.m11
    const determinant = matrix.m00 * matrix.m11 - matrix.m01 * matrix.m10
    if (Math.abs(dot) > width * height * 1e-8 || determinant <= 0) {
      problem(path, 'Skewed or mirrored elliptical gradients are not supported by .pen.')
      return null
    }
    if (fill.type === 'GRADIENT_RADIAL') {
      rotation = (Math.atan2(-matrix.m10, matrix.m00) * 180) / Math.PI
      gradientType = 'radial'
    } else {
      rotation = (Math.atan2(-matrix.m00, -matrix.m10) * 180) / Math.PI
      ;[width, height] = [height, width]
      gradientType = 'angular'
    }
  }
  return {
    type: 'gradient',
    gradientType,
    center,
    size: { width, height },
    rotation,
    opacity: fill.opacity,
    colors: (fill.gradientStops ?? []).map((stop) => ({
      color: colorToHex8(stop.color),
      position: stop.position
    }))
  }
}

function meshGradient(fill: Fill, path: string, problem: PaintProblem): PenMeshPaint | null {
  const result = v.safeParse(meshGradientSchema, fill.meshGradient)
  if (!result.success) {
    problem(`${path}/meshGradient`, 'Mesh colors and points must match valid dimensions.')
    return null
  }
  const mesh = result.output
  const vector = (point: Vector): [number, number] => [point.x, point.y]
  return {
    type: 'mesh_gradient',
    columns: mesh.columns,
    rows: mesh.rows,
    colors: mesh.colors.map((color) => colorToHex8(color)),
    points: mesh.points.map((point) => projectMeshPoint(point, vector)),
    opacity: fill.opacity
  }
}

function image(
  graph: SceneGraph,
  fill: Fill,
  path: string,
  problem: PaintProblem
): PenImagePaint | null {
  const bytes = fill.imageHash ? graph.images.get(fill.imageHash) : undefined
  const header = bytes ? imageHeader(bytes) : null
  if (!bytes || !header) {
    problem(
      `${path}/imageHash`,
      'Image bytes are missing or are not a supported PNG, JPEG, GIF or WebP.'
    )
    return null
  }
  if (fill.imageRotation)
    problem(
      `${path}/imageRotation`,
      'Rotated image paints are not yet supported; use an explicit crop transform.'
    )
  if (fill.imageScaleMode === 'TILE')
    problem(`${path}/imageScaleMode`, 'Tiled image paints are not supported by .pen.')
  let transform: [number, number, number, number, number, number] | undefined
  if (fill.imageScaleMode === 'CROP') {
    const crop = fill.imageTransform ?? IDENTITY_GRADIENT_TRANSFORM
    if (Math.abs(crop.m00 * crop.m11 - crop.m01 * crop.m10) < 1e-12)
      problem(`${path}/imageTransform`, 'Singular image crops cannot be represented.')
    const inverse = invertGradientTransform(crop)
    transform = [inverse.m00, inverse.m10, inverse.m01, inverse.m11, inverse.m02, inverse.m12]
  }
  return {
    type: 'image',
    url: `data:${header.type};base64,${fromUint8Array(bytes)}`,
    mode: { CROP: 'stretch', FIT: 'contain', FILL: 'cover', TILE: 'cover' }[
      fill.imageScaleMode ?? 'FILL'
    ],
    opacity: fill.opacity,
    transform
  }
}

export function writePaints(
  graph: SceneGraph,
  fills: readonly Fill[],
  path: string,
  problem: PaintProblem,
  node?: Pick<SceneNode, 'pluginData'>
): PenPaint[] {
  return fills.flatMap<PenPaint>((fill, index) => {
    const at = `${path}/${index}`
    const blendMode = fill.blendMode ? penBlendMode(fill.blendMode) : undefined
    if (fill.blendMode && !blendMode)
      problem(`${at}/blendMode`, `Paint blend mode ${fill.blendMode} is not supported.`)
    const common = { enabled: fill.visible, blendMode }
    const shader = node ? shaderOfPaint(node, fill) : null
    const fragment = shader ? fragmentShaderOf(shader.preset) : null
    if (fragment)
      return [
        {
          type: 'shader',
          url: fragment.url,
          uniforms: fragment.uniforms,
          opacity: fill.opacity,
          openPenSource: fragment.source,
          openPenShaderError: fragment.error,
          ...common
        }
      ]
    if (fill.type === 'SOLID')
      return [{ type: 'color', color: colorToHex8(fill.color, fill.opacity), ...common }]
    if (['GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR'].includes(fill.type)) {
      const paint = gradient(fill, at, problem)
      return paint ? [{ ...paint, ...common }] : []
    }
    if (fill.type === 'GRADIENT_MESH') {
      const paint = meshGradient(fill, at, problem)
      return paint ? [{ ...paint, ...common }] : []
    }
    if (fill.type === 'IMAGE') {
      const paint = image(graph, fill, at, problem)
      return paint ? [{ ...paint, ...common }] : []
    }
    problem(at, `${fill.type} paints are not supported by this writer.`)
    return []
  })
}
