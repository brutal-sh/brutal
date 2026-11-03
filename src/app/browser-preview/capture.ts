import * as v from 'valibot'

import { imageHeader } from '@open-pencil/scene-graph/images'

import { MAX_CAPTURE_BYTES } from './schema'

const dimensionSchema = v.pipe(v.number(), v.finite(), v.minValue(1), v.maxValue(65536))
const manifestSchema = v.strictObject({
  version: v.literal(1),
  requestId: v.pipe(v.string(), v.uuid()),
  url: v.string(),
  title: v.pipe(v.string(), v.maxLength(512)),
  slices: v.pipe(
    v.array(
      v.strictObject({
        width: dimensionSchema,
        height: dimensionSchema,
        bytes: v.pipe(v.number(), v.integer(), v.minValue(24), v.maxValue(MAX_CAPTURE_BYTES))
      })
    ),
    v.minLength(1),
    v.maxLength(1024)
  )
})

export type BrowserCaptureScope = 'visible' | 'full' | 'selected'
export interface BrowserCapture {
  url: string
  title: string
  slices: Array<{ png: Uint8Array<ArrayBuffer>; width: number; height: number }>
}

/** The bounded manifest carries CSS dimensions beside untouched, display-density PNG bytes. */
export function readBrowserCapture(input: unknown, requestId: string, url: string): BrowserCapture {
  if (
    !(input instanceof ArrayBuffer) ||
    input.byteLength < 4 ||
    input.byteLength > MAX_CAPTURE_BYTES
  )
    throw new Error('The browser returned an invalid screenshot payload.')
  const length = new DataView(input).getUint32(0, true)
  if (length > 256 * 1024 || length + 4 > input.byteLength)
    throw new Error('The browser returned an invalid screenshot manifest.')
  const decoded = v.safeParse(
    v.pipe(v.string(), v.parseJson(), manifestSchema),
    new TextDecoder().decode(new Uint8Array(input, 4, length))
  )
  if (!decoded.success || decoded.output.requestId !== requestId || decoded.output.url !== url)
    throw new Error('The browser returned an expired or invalid screenshot. Try again.')
  const manifest = decoded.output
  let offset = length + 4
  let pixels = 0
  let height = 0
  let scale: number | undefined
  const slices = manifest.slices.map((slice) => {
    if (offset + slice.bytes > input.byteLength)
      throw new Error('The browser screenshot is truncated.')
    const png = new Uint8Array(input.slice(offset, offset + slice.bytes))
    offset += slice.bytes
    const header = imageHeader(png)
    if (
      !header ||
      header.type !== 'image/png' ||
      header.width < 1 ||
      header.height < 1 ||
      header.width * header.height > 16_000_000 ||
      slice.width > 16384 ||
      slice.width !== manifest.slices[0]?.width
    )
      throw new Error('The browser returned invalid screenshot dimensions.')
    pixels += header.width * header.height
    const density = header.width / slice.width
    if (
      density < 0.1 ||
      density > 16 ||
      Math.abs(header.height - slice.height * density) > 1 ||
      (scale !== undefined && Math.abs(header.width - slice.width * scale) > 1)
    )
      throw new Error('The browser screenshot changed display scale.')
    scale ??= density
    height += slice.height
    if (pixels > 64_000_000 || height > 65536)
      throw new Error('The browser screenshot exceeds the image limit.')
    return { png, width: slice.width, height: slice.height }
  })
  if (offset !== input.byteLength)
    throw new Error('The browser screenshot contains unexpected data.')
  return { url: manifest.url, title: manifest.title, slices }
}
