import stripJSONComments from 'strip-json-comments'
import * as v from 'valibot'

import { MAX_MESH_DIMENSION } from '@open-pencil/scene-graph/constants'
import {
  MAX_FRAGMENT_SOURCE_LENGTH,
  MAX_FRAGMENT_ERROR_LENGTH,
  shaderUniformValueSchema
} from '@open-pencil/scene-graph/shaders'

/**
 * The `.pen` document as pen.dev writes it (schema 2.21), plus the older forms still found in
 * files: the object `stroke` of 2.8 and `icon_font` nodes. Properties typed `…OrVariable` hold a
 * `$name` reference in place of the value. Enumerated values stay strings so a value this reader
 * does not know falls back to the default instead of rejecting the document.
 */

const numSchema = v.union([v.number(), v.string()])
const boolSchema = v.union([v.boolean(), v.string()])
const strSchema = v.string()
const sidesSchema = v.looseObject({
  top: v.optional(numSchema),
  right: v.optional(numSchema),
  bottom: v.optional(numSchema),
  left: v.optional(numSchema)
})

const paintBase = {
  enabled: v.optional(boolSchema),
  blendMode: v.optional(strSchema)
}

const colorPaintSchema = v.looseObject({
  type: v.literal('color'),
  ...paintBase,
  color: strSchema
})

const gradientPaintSchema = v.looseObject({
  type: v.literal('gradient'),
  ...paintBase,
  gradientType: v.optional(strSchema),
  opacity: v.optional(numSchema),
  center: v.optional(v.looseObject({ x: v.optional(v.number()), y: v.optional(v.number()) })),
  size: v.optional(v.looseObject({ width: v.optional(numSchema), height: v.optional(numSchema) })),
  rotation: v.optional(numSchema),
  colors: v.optional(v.array(v.looseObject({ color: strSchema, position: numSchema })))
})

const imagePaintSchema = v.looseObject({
  type: v.literal('image'),
  ...paintBase,
  opacity: v.optional(numSchema),
  url: v.optional(strSchema),
  mode: v.optional(strSchema),
  transform: v.optional(
    v.tuple([v.number(), v.number(), v.number(), v.number(), v.number(), v.number()])
  )
})

const meshDimensionSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(2),
  v.maxValue(MAX_MESH_DIMENSION)
)
const meshVectorSchema = v.tuple([v.pipe(v.number(), v.finite()), v.pipe(v.number(), v.finite())])
const meshPointSchema = v.union([
  meshVectorSchema,
  v.object({
    position: meshVectorSchema,
    leftHandle: v.optional(meshVectorSchema),
    rightHandle: v.optional(meshVectorSchema),
    topHandle: v.optional(meshVectorSchema),
    bottomHandle: v.optional(meshVectorSchema)
  })
])
export const penMeshPaintSchema = v.pipe(
  v.looseObject({
    type: v.literal('mesh_gradient'),
    ...paintBase,
    opacity: v.optional(numSchema),
    columns: v.optional(meshDimensionSchema),
    rows: v.optional(meshDimensionSchema),
    colors: v.optional(v.pipe(v.array(strSchema), v.maxLength(MAX_MESH_DIMENSION ** 2))),
    points: v.optional(v.pipe(v.array(meshPointSchema), v.maxLength(MAX_MESH_DIMENSION ** 2)))
  }),
  v.check((mesh) => {
    const count = (mesh.columns ?? 3) * (mesh.rows ?? 3)
    return (
      (!mesh.colors || mesh.colors.length === count) &&
      (!mesh.points || mesh.points.length === count)
    )
  }, 'Mesh colors and points must match its dimensions.')
)

export const penShaderPaintSchema = v.looseObject({
  type: v.literal('shader'),
  ...paintBase,
  opacity: v.optional(numSchema),
  url: v.pipe(v.string(), v.maxLength(16384)),
  uniforms: v.optional(v.record(v.string(), shaderUniformValueSchema)),
  /** Open Pen source snapshot; Pen uses the ordinary URL beside it. */
  openPenSource: v.optional(v.pipe(v.string(), v.maxLength(MAX_FRAGMENT_SOURCE_LENGTH))),
  openPenShaderError: v.optional(
    v.pipe(v.string(), v.nonEmpty(), v.maxLength(MAX_FRAGMENT_ERROR_LENGTH))
  )
})

/** Any paint type this reader does not draw. */
const otherPaintSchema = v.looseObject({ type: strSchema, ...paintBase })

const paintSchema = v.union([
  strSchema,
  colorPaintSchema,
  gradientPaintSchema,
  imagePaintSchema,
  penMeshPaintSchema,
  penShaderPaintSchema,
  otherPaintSchema
])
const paintsSchema = v.union([paintSchema, v.array(paintSchema)])

/** The 2.8 stroke: one colour with its weight and placement in one object. */
const legacyStrokeSchema = v.looseObject({
  thickness: v.union([numSchema, sidesSchema]),
  fill: v.optional(paintsSchema),
  align: v.optional(strSchema),
  join: v.optional(strSchema),
  cap: v.optional(strSchema)
})

const effectSchema = v.looseObject({
  type: strSchema,
  enabled: v.optional(boolSchema),
  radius: v.optional(numSchema),
  shadowType: v.optional(strSchema),
  offset: v.optional(v.looseObject({ x: numSchema, y: numSchema })),
  blur: v.optional(numSchema),
  /** Written by older files; current pen.dev shadows have no spread. */
  spread: v.optional(numSchema),
  color: v.optional(strSchema),
  blendMode: v.optional(strSchema)
})

const sizeSchema = numSchema
const paddingSchema = v.union([
  numSchema,
  v.strictTuple([numSchema, numSchema]),
  v.strictTuple([numSchema, numSchema, numSchema, numSchema])
])
const cornerRadiusSchema = v.union([numSchema, v.array(numSchema)])

/** Every property a node, or an override of one, can carry. */
const nodeFields = {
  name: v.optional(strSchema),
  context: v.optional(strSchema),
  x: v.optional(v.number()),
  y: v.optional(v.number()),
  width: v.optional(sizeSchema),
  height: v.optional(sizeSchema),
  reusable: v.optional(v.boolean()),
  theme: v.optional(v.record(strSchema, strSchema)),
  enabled: v.optional(boolSchema),
  opacity: v.optional(numSchema),
  flipX: v.optional(boolSchema),
  flipY: v.optional(boolSchema),
  layoutPosition: v.optional(strSchema),
  rotation: v.optional(numSchema),

  fill: v.optional(paintsSchema),
  stroke: v.optional(v.union([paintsSchema, legacyStrokeSchema])),
  strokeWidth: v.optional(v.union([numSchema, sidesSchema])),
  strokeLinecap: v.optional(strSchema),
  strokeLinejoin: v.optional(strSchema),
  strokeAlignment: v.optional(strSchema),
  effect: v.optional(v.union([effectSchema, v.array(effectSchema)])),
  cornerRadius: v.optional(cornerRadiusSchema),

  layout: v.optional(strSchema),
  gap: v.optional(numSchema),
  layoutIncludeStroke: v.optional(v.boolean()),
  padding: v.optional(paddingSchema),
  justifyContent: v.optional(strSchema),
  alignItems: v.optional(strSchema),
  clip: v.optional(boolSchema),
  placeholder: v.optional(v.boolean()),
  slot: v.optional(v.union([v.literal(false), v.array(strSchema)])),

  innerRadius: v.optional(numSchema),
  startAngle: v.optional(numSchema),
  sweepAngle: v.optional(numSchema),
  polygonCount: v.optional(numSchema),
  geometry: v.optional(strSchema),
  fillRule: v.optional(strSchema),
  viewBox: v.optional(v.tuple([v.number(), v.number(), v.number(), v.number()])),

  content: v.optional(strSchema),
  textGrowth: v.optional(strSchema),
  fontFamily: v.optional(strSchema),
  fontSize: v.optional(numSchema),
  fontWeight: v.optional(numSchema),
  fontStyle: v.optional(strSchema),
  letterSpacing: v.optional(numSchema),
  lineHeight: v.optional(numSchema),
  textAlign: v.optional(strSchema),
  textAlignVertical: v.optional(strSchema),
  underline: v.optional(boolSchema),
  strikethrough: v.optional(boolSchema),
  href: v.optional(strSchema),

  library: v.optional(strSchema),
  icon: v.optional(strSchema),
  weight: v.optional(numSchema),
  iconFontName: v.optional(strSchema),
  iconFontFamily: v.optional(strSchema),

  scriptUri: v.optional(v.string()),
  inputs: v.optional(
    v.record(v.string(), v.union([v.string(), v.pipe(v.number(), v.finite()), v.boolean()]))
  ),
  ref: v.optional(strSchema)
}

export type NodeFields = v.InferOutput<v.ObjectSchema<typeof nodeFields, undefined>>

/** Properties an instance sets on one of its component's descendants, or a node replacing it. */
export interface PenOverride extends NodeFields {
  type?: string
  id?: string
  children?: PenNode[]
  descendants?: Record<string, PenOverride>
  [key: string]: unknown
}

export interface PenNode extends PenOverride {
  type: string
  id: string
}

const overrideSchema: v.GenericSchema<unknown, PenOverride> = v.looseObject({
  ...nodeFields,
  type: v.optional(strSchema),
  id: v.optional(strSchema),
  children: v.optional(v.array(v.lazy(() => nodeSchema))),
  descendants: v.optional(
    v.record(
      strSchema,
      v.lazy(() => overrideSchema)
    )
  )
})

const nodeSchema: v.GenericSchema<unknown, PenNode> = v.looseObject({
  ...nodeFields,
  type: strSchema,
  id: strSchema,
  children: v.optional(v.array(v.lazy(() => nodeSchema))),
  descendants: v.optional(v.record(strSchema, overrideSchema))
})

const variableScalarSchema = v.union([v.string(), v.number(), v.boolean()])

const variableSchema = v.looseObject({
  type: strSchema,
  value: v.union([
    variableScalarSchema,
    v.array(
      v.looseObject({
        value: variableScalarSchema,
        theme: v.optional(v.record(strSchema, strSchema))
      })
    )
  ])
})

export const penDocumentSchema = v.looseObject({
  version: v.optional(strSchema),
  themes: v.optional(v.record(strSchema, v.array(strSchema))),
  imports: v.optional(v.record(strSchema, strSchema)),
  variables: v.optional(v.record(strSchema, variableSchema)),
  children: v.array(nodeSchema)
})

export type PenDocument = v.InferOutput<typeof penDocumentSchema>
export type PenVariable = v.InferOutput<typeof variableSchema>
export type PenVariableScalar = v.InferOutput<typeof variableScalarSchema>
export type PenPaint = v.InferOutput<typeof paintSchema>
export type PenPaints = v.InferOutput<typeof paintsSchema>
export type PenGradientPaint = v.InferOutput<typeof gradientPaintSchema>
export type PenMeshPaint = v.InferOutput<typeof penMeshPaintSchema>
export type PenImagePaint = v.InferOutput<typeof imagePaintSchema>
export type PenShaderPaint = v.InferOutput<typeof penShaderPaintSchema>
export type PenLegacyStroke = v.InferOutput<typeof legacyStrokeSchema>
export type PenEffect = v.InferOutput<typeof effectSchema>
export type PenSides = v.InferOutput<typeof sidesSchema>
export type PenNumber = v.InferOutput<typeof numSchema>

// pen.dev accepts JSON comments. Keep whitespace/strict JSON parsing so token boundaries,
// malformed input, unterminated block comments and trailing commas remain errors.
export const penFileSchema = v.pipe(
  v.string(),
  v.transform((source) =>
    // The library only terminates line comments on LF/CRLF. Raw CR is illegal inside JSON
    // strings, so normalizing a lone CR preserves valid string values and strict rejection.
    stripJSONComments(source.replace(/\r(?!\n)/g, '\n'), {
      whitespace: true,
      trailingCommas: false
    })
  ),
  v.parseJson(),
  penDocumentSchema
)
