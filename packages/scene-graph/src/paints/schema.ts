import * as v from 'valibot'

import { colorSchema } from '../color/schema'
import { MAX_MESH_DIMENSION } from '../constants'
import { finiteNumberSchema, matrixSchema, vectorSchema } from '../primitives/schema'
import type { FillType, GradientTransform } from '../types'

const meshDimensionSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(2),
  v.maxValue(MAX_MESH_DIMENSION)
)
const meshPointSchema = v.object({
  position: vectorSchema,
  leftHandle: v.optional(vectorSchema),
  rightHandle: v.optional(vectorSchema),
  topHandle: v.optional(vectorSchema),
  bottomHandle: v.optional(vectorSchema)
})
export const meshGradientSchema = v.pipe(
  v.object({
    columns: meshDimensionSchema,
    rows: meshDimensionSchema,
    colors: v.pipe(v.array(colorSchema), v.maxLength(MAX_MESH_DIMENSION ** 2)),
    points: v.pipe(v.array(meshPointSchema), v.maxLength(MAX_MESH_DIMENSION ** 2))
  }),
  v.check(
    (mesh) =>
      mesh.points.length === mesh.columns * mesh.rows &&
      mesh.colors.length === mesh.columns * mesh.rows,
    'Mesh colors and points must match its dimensions.'
  )
)

export const gradientStopSchema = v.object({ position: finiteNumberSchema, color: colorSchema })

const transformRowSchema = v.strictTuple([
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema
])

/**
 * A paint's `gradientTransform` or `imageTransform` as an author writes it, read into the matrix
 * fields: Figma's two rows of three, as its plugin API gives them, or the fields themselves. An
 * extra row, value, or field is refused rather than dropped.
 */
export const paintTransformSchema = v.union(
  [
    v.pipe(
      v.strictTuple([transformRowSchema, transformRowSchema]),
      v.transform(([[m00, m01, m02], [m10, m11, m12]]): GradientTransform => ({
        m00,
        m01,
        m02,
        m10,
        m11,
        m12
      }))
    ),
    v.strictObject(matrixSchema.entries)
  ],
  (issue) =>
    `Expected [[a, b, c], [d, e, f]] or { m00, m01, m02, m10, m11, m12 } but received ${issue.received}`
)

/** Every fill type, as a record so a type added to `FillType` fails to compile until listed. */
const FILL_TYPES = {
  SOLID: true,
  GRADIENT_LINEAR: true,
  GRADIENT_RADIAL: true,
  GRADIENT_ANGULAR: true,
  GRADIENT_DIAMOND: true,
  GRADIENT_MESH: true,
  IMAGE: true,
  VIDEO: true,
  PATTERN: true,
  NOISE: true,
  CUSTOM: true
} as const satisfies Record<FillType, true>

/**
 * A fill as data from outside the process, such as a collaborator's, can hold it: the fields a
 * renderer reads without checking are checked, and the rest pass through as they are.
 */
export const fillSchema = v.looseObject({
  type: v.picklist(Object.keys(FILL_TYPES) as FillType[]),
  color: colorSchema,
  opacity: finiteNumberSchema,
  visible: v.boolean(),
  meshGradient: v.optional(meshGradientSchema),
  gradientStops: v.optional(v.array(gradientStopSchema)),
  gradientTransform: v.optional(matrixSchema),
  imageTransform: v.optional(matrixSchema),
  patternSpacing: v.optional(vectorSchema),
  noiseSize: v.optional(vectorSchema)
})
