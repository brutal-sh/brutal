import * as v from 'valibot'

import { previewURL } from '../schema'

const tagSchema = v.pipe(v.string(), v.maxLength(64), v.regex(/^[a-z][a-z\d:-]*$/))
const idSchema = v.pipe(v.string(), v.maxLength(256))
const coordinateSchema = v.pipe(v.number(), v.finite(), v.minValue(-65536), v.maxValue(65536))
const dimensionSchema = v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(32768))
const selectionSchema = v.strictObject({
  tag: tagSchema,
  id: idSchema,
  classes: v.pipe(v.string(), v.maxLength(2048)),
  box: v.strictObject({
    x: coordinateSchema,
    y: coordinateSchema,
    width: dimensionSchema,
    height: dimensionSchema
  }),
  styles: v.pipe(
    v.record(v.pipe(v.string(), v.maxLength(64)), v.pipe(v.string(), v.maxLength(2048))),
    v.check((styles) => Object.keys(styles).length <= 64)
  ),
  path: v.pipe(
    v.array(v.strictObject({ tag: tagSchema, id: idSchema })),
    v.minLength(1),
    v.maxLength(64)
  )
})
export const browserPickerSchema = v.strictObject({
  requestId: v.pipe(v.string(), v.uuid()),
  url: v.pipe(v.string(), v.url(), v.maxLength(8192)),
  picking: v.boolean(),
  pick: v.nullable(selectionSchema),
  action: v.nullable(v.picklist(['import', 'capture']))
})
export type BrowserPickerState = v.InferOutput<typeof browserPickerSchema>
export type BrowserSelection = NonNullable<BrowserPickerState['pick']>
export type BrowserPickerAction = 'start' | 'stop' | 'read' | 'select'

export function validateBrowserPicker(
  input: unknown,
  requestId: string,
  url: string,
  authorizedExportURL?: string
): BrowserPickerState {
  const result = v.safeParse(browserPickerSchema, input)
  if (!result.success) throw new Error('The browser returned an invalid element selection.')
  if (
    result.output.requestId !== requestId ||
    previewURL(result.output.url, authorizedExportURL) !== previewURL(url, authorizedExportURL)
  )
    throw new Error('The browser page changed. Select the element again.')
  return result.output
}
