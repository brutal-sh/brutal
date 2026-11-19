import * as v from 'valibot'

const coordinateSchema = v.pipe(v.number(), v.minValue(-1e7), v.maxValue(1e7))
const sizeSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(1e7))
const fractionSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(1))

const colorSchema = v.object({
  red: fractionSchema,
  green: fractionSchema,
  blue: fractionSchema,
  alpha: fractionSchema
})
const contextSchema = v.object({
  opacity: v.optional(fractionSchema, 1),
  blendMode: v.optional(v.number(), 0)
})
const paintSchema = v.object({
  isEnabled: v.optional(v.boolean(), true),
  fillType: v.optional(v.number(), 0),
  color: v.optional(colorSchema),
  contextSettings: v.optional(contextSchema),
  thickness: v.optional(sizeSchema),
  position: v.optional(v.number())
})
const effectSchema = v.object({ isEnabled: v.optional(v.boolean(), true) })
const styleSchema = v.object({
  contextSettings: v.optional(contextSchema),
  fills: v.optional(v.array(paintSchema), []),
  borders: v.optional(v.array(paintSchema), []),
  shadows: v.optional(v.array(effectSchema), []),
  innerShadows: v.optional(v.array(effectSchema), []),
  blur: v.optional(effectSchema)
})

const textAttributesSchema = v.object({
  MSAttributedStringFontAttribute: v.optional(
    v.object({
      attributes: v.object({ name: v.string(), size: sizeSchema })
    })
  ),
  MSAttributedStringColorAttribute: v.optional(colorSchema),
  paragraphStyle: v.optional(
    v.object({
      alignment: v.optional(v.number()),
      minimumLineHeight: v.optional(sizeSchema),
      maximumLineHeight: v.optional(sizeSchema)
    })
  )
})

export const sketchDocumentSchema = v.object({
  pages: v.pipe(
    v.array(
      v.object({
        _ref: v.pipe(v.string(), v.regex(/^pages\/[\w-]+(?:\.json)?$/))
      })
    ),
    v.minLength(1),
    v.maxLength(256)
  )
})

export const sketchPageSchema = v.object({
  _class: v.literal('page'),
  name: v.string(),
  layers: v.array(v.unknown())
})

export const sketchLayerSchema = v.object({
  _class: v.string(),
  name: v.string(),
  frame: v.object({
    x: coordinateSchema,
    y: coordinateSchema,
    width: sizeSchema,
    height: sizeSchema
  }),
  layers: v.optional(v.array(v.unknown()), []),
  rotation: v.optional(coordinateSchema, 0),
  isVisible: v.optional(v.boolean(), true),
  isLocked: v.optional(v.boolean(), false),
  isFlippedHorizontal: v.optional(v.boolean(), false),
  isFlippedVertical: v.optional(v.boolean(), false),
  hasClippingMask: v.optional(v.boolean(), false),
  shouldBreakMaskChain: v.optional(v.boolean(), false),
  hasBackgroundColor: v.optional(v.boolean(), false),
  backgroundColor: v.optional(colorSchema),
  fixedRadius: v.optional(sizeSchema, 0),
  points: v.optional(v.array(v.object({ cornerRadius: v.optional(sizeSchema, 0) })), []),
  style: v.optional(styleSchema),
  attributedString: v.optional(
    v.object({
      string: v.string(),
      attributes: v.optional(v.array(v.object({ attributes: textAttributesSchema })), [])
    })
  ),
  image: v.optional(v.object({ _ref: v.string() }))
})

export type SketchLayer = v.InferOutput<typeof sketchLayerSchema>
export type SketchPaint = v.InferOutput<typeof paintSchema>
