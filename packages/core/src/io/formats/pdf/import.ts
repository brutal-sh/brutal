import { SceneGraph } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'
import { imageHeader } from '@open-pencil/scene-graph/images'

import { storeImage } from '#core/figma-api/images'

const MAX_PAGES = 32
const MAX_BITMAP_SIDE = 2048
const MAX_PAGE_SIDE = 100_000
const MAX_RENDER_BYTES = 48 * 1024 * 1024
const PAGE_HEADER_BYTES = 20

/** Reads the bounded page images produced by the platform PDF renderer. */
export function readPDFPageImages(bytes: Uint8Array): SceneGraph {
  if (bytes.byteLength < 4 || bytes.byteLength > MAX_RENDER_BYTES) throw invalidPageImages()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const pages = view.getUint32(0, true)
  if (pages < 1 || pages > MAX_PAGES) throw invalidPageImages()
  const graph = new SceneGraph()
  let offset = 4
  for (let index = 0; index < pages; index++) {
    const page = readPageImage(bytes, view, offset)
    addPage(graph, page, index)
    offset = page.nextOffset
  }
  if (offset !== bytes.byteLength) throw invalidPageImages()
  return graph
}

function invalidPageImages(): Error {
  return new Error('The PDF renderer returned invalid page data.')
}

function pageSide(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= MAX_PAGE_SIDE
}

function readPageImage(bytes: Uint8Array, view: DataView, offset: number) {
  const start = offset + PAGE_HEADER_BYTES
  if (start > view.byteLength) throw invalidPageImages()
  const width = view.getFloat64(offset, true)
  const height = view.getFloat64(offset + 8, true)
  const nextOffset = start + view.getUint32(offset + 16, true)
  if (!pageSide(width) || !pageSide(height) || nextOffset > bytes.byteLength)
    throw invalidPageImages()
  const png = bytes.subarray(start, nextOffset)
  const header = imageHeader(png)
  if (
    header?.type !== 'image/png' ||
    header.width < 1 ||
    header.height < 1 ||
    Math.max(header.width, header.height) > MAX_BITMAP_SIDE
  )
    throw invalidPageImages()
  return { width, height, png, nextOffset }
}

function addPage(graph: SceneGraph, page: ReturnType<typeof readPageImage>, index: number) {
  const name = `Page ${index + 1}`
  const target = index === 0 ? graph.getPages()[0] : graph.addPage(name)
  graph.createNode('RECTANGLE', target.id, {
    name: `${name} artwork`,
    width: page.width,
    height: page.height,
    fills: [
      {
        type: 'IMAGE',
        color: BLACK,
        opacity: 1,
        visible: true,
        imageHash: storeImage(graph, page.png),
        imageScaleMode: 'CROP',
        imageTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
      }
    ]
  })
}
