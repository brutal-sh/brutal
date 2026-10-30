import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import { previewURL } from '@/app/browser-preview/schema'

const boundedNumberSchema = v.pipe(v.number(), v.finite(), v.minValue(-32768), v.maxValue(65536))
const dimensionSchema = v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(32768))
const nodeIdSchema = v.pipe(v.string(), v.regex(/^node-\d+$/))
const shortTextSchema = v.pipe(v.string(), v.maxLength(2048))
const nodeSchema = v.strictObject({
  id: nodeIdSchema,
  parentId: v.nullable(nodeIdSchema),
  type: v.picklist(['element', 'text']),
  path: v.pipe(v.string(), v.maxLength(2048)),
  tag: v.pipe(v.string(), v.maxLength(32)),
  box: v.strictObject({
    x: boundedNumberSchema,
    y: boundedNumberSchema,
    width: dimensionSchema,
    height: dimensionSchema
  }),
  style: v.record(v.pipe(v.string(), v.maxLength(64)), shortTextSchema),
  text: v.optional(v.pipe(v.string(), v.maxLength(256000))),
  image: v.optional(v.pipe(v.string(), v.maxLength(3 * 1024 * 1024)))
})
const extractionSchema = v.strictObject({
  version: v.literal(1),
  requestId: v.pipe(v.string(), v.uuid()),
  url: v.pipe(v.string(), v.url(), v.maxLength(8192)),
  title: v.pipe(v.string(), v.maxLength(256)),
  width: v.pipe(dimensionSchema, v.minValue(1)),
  height: v.pipe(dimensionSchema, v.minValue(1)),
  viewportWidth: v.pipe(dimensionSchema, v.minValue(1)),
  viewportHeight: v.pipe(dimensionSchema, v.minValue(1)),
  background: shortTextSchema,
  nodes: v.pipe(v.array(nodeSchema), v.minLength(1), v.maxLength(5000)),
  diagnostics: v.pipe(
    v.array(v.strictObject({ path: shortTextSchema, message: shortTextSchema })),
    v.maxLength(100)
  )
})

export type ExtractedPage = v.InferOutput<typeof extractionSchema>
export type ExtractedNode = ExtractedPage['nodes'][number]

export function validateExtractedPage(
  input: unknown,
  requestId: string,
  url: string
): ExtractedPage {
  if (new TextEncoder().encode(JSON.stringify(input)).length > 16 * 1024 * 1024)
    throw new Error('The page exceeds the editable import payload limit.')
  const parsed = v.safeParse(extractionSchema, input)
  if (!parsed.success)
    throw new Error('The browser returned an invalid page description. The design was not changed.')
  const page = parsed.output
  if (page.requestId !== requestId || previewURL(page.url) !== previewURL(url))
    throw new Error('The preview changed or the import response expired. Import again.')
  if (page.diagnostics.length)
    throw new Error(
      `Editable import cannot preserve this page yet:\n${page.diagnostics
        .slice(0, 8)
        .map((item) => `${item.path}: ${item.message}`)
        .join('\n')}${page.diagnostics.length > 8 ? '\nMore unsupported content was found.' : ''}`
    )
  validateNodes(page)
  return page
}

function validateNodes(page: ExtractedPage) {
  const depths = new Map<string, number>()
  let textLength = 0
  let imageLength = 0
  for (const node of page.nodes) {
    const depth = node.parentId === null ? 0 : (depths.get(node.parentId) ?? -2) + 1
    if (depth < 0 || depth > 64 || depths.has(node.id) || Object.keys(node.style).length > 64)
      throw new Error('The browser returned an invalid or excessive page hierarchy.')
    depths.set(node.id, depth)
    textLength += node.text?.length ?? 0
    if (textLength > 256000 || (node.type === 'text' && node.text === undefined))
      throw new Error('The browser returned invalid or excessive page text.')
    if (node.tag === 'img' && !node.image)
      throw new Error(`${node.path}: image pixels are missing. The design was not changed.`)
    if (!node.image) continue
    imageLength += node.image.length
    validateImage(node, imageLength)
  }
}

function validateImage(node: ExtractedNode, imageLength: number) {
  if (!node.image) return
  const prefix = 'data:image/png;base64,'
  const encoded = node.image.slice(prefix.length)
  if (imageLength > 10 * 1024 * 1024 || !node.image.startsWith(prefix) || !isValid(encoded))
    throw new Error(`${node.path}: invalid or excessive image data.`)
  const bytes = toUint8Array(encoded)
  if (bytes.length < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte))
    throw new Error(`${node.path}: the image is not PNG data.`)
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = header.getUint32(16)
  const height = header.getUint32(20)
  if (!width || !height || width > 4096 || height > 4096 || width * height > 4000000)
    throw new Error(`${node.path}: image dimensions exceed the import limit.`)
}
