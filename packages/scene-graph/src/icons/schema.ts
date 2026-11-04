import * as v from 'valibot'

import { fillSchema, strokeSchema } from '../paints/schema'
import { finiteNumberSchema } from '../primitives/schema'
import type { Fill } from '../types'

/**
 * An icon's name in its set, `prefix:name`, as Iconify names icons. Names may hold dots, as SF
 * Symbols' do (`house.fill`).
 */
export const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_.][a-z0-9]+)*$/

/**
 * How an icon from a set we draw ourselves is drawn: a font's axes, such as Material Symbols'
 * `wght` and `FILL`, or SF Symbols' weight and scale. Icons from Iconify have none.
 */
export const iconOptionsSchema = v.record(v.string(), v.union([v.number(), v.string()]))

export type IconOptions = v.InferOutput<typeof iconOptionsSchema>

/** Authored .pen identity references that the resolved glyph cannot reconstruct. */
export const penIconReferencesSchema = v.partial(
  v.object({
    library: v.string(),
    icon: v.string(),
    weight: v.string()
  })
)

export const iconSchema = v.object({
  name: v.pipe(v.string(), v.regex(ICON_NAME)),
  /** A fingerprint of the glyph as placed, to tell when its paths were edited; see `iconGlyph`. */
  glyph: v.optional(v.string()),
  /** Exact placed geometry for formats that replace paths with a named glyph. */
  drawing: v.optional(v.string()),
  /** Authored paints live on the frame; its paths derive their tinted paints from them. */
  paintSource: v.optional(v.literal('frame')),
  /**
   * Set for an icon drawn from one of our own sets rather than Iconify, so it is drawn again and
   * exported as the paths it draws rather than by its name alone.
   */
  options: v.optional(iconOptionsSchema)
})

/** An icon a frame draws. */
export type Icon = v.InferOutput<typeof iconSchema>

export const ICON_PAINTS = ['fill', 'stroke'] as const
export type IconPaint = (typeof ICON_PAINTS)[number]

export const iconTintSchema = v.pipe(v.array(v.picklist(ICON_PAINTS)), v.minLength(1))

export const iconFillsSchema: v.GenericSchema<unknown, Fill[]> = v.array(fillSchema)

/** Intrinsic SVG paints, independent of the icon's editable paint stack. */
export const iconPaintSourceSchema = v.object({
  fills: iconFillsSchema,
  strokes: v.array(strokeSchema),
  width: v.optional(finiteNumberSchema),
  height: v.optional(finiteNumberSchema)
})

export type IconPaintSource = v.InferOutput<typeof iconPaintSourceSchema>
