import { expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'
import { readRasterPageImages } from '#core/io/formats/raster'

const png = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
)

function renderedPages() {
  const entryBytes = 20 + png.length
  const bytes = new Uint8Array(4 + entryBytes * 2)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 2, true)
  for (const [index, width, height] of [
    [0, 160, 100],
    [1, 120, 220]
  ]) {
    const offset = 4 + index * entryBytes
    view.setFloat64(offset, width, true)
    view.setFloat64(offset + 8, height, true)
    view.setUint32(offset + 16, png.length, true)
    bytes.set(png, offset + 20)
  }
  return bytes
}

test('places page images at the original size and preserves them in a separate FIG', async () => {
  const graph = readRasterPageImages(renderedPages())
  const [first, second] = graph.getPages()
  expect(graph.getChildren(first.id)[0]).toMatchObject({
    name: 'Page 1 artwork',
    width: 160,
    height: 100
  })
  expect(graph.getChildren(second.id)[0]).toMatchObject({
    name: 'Page 2 artwork',
    width: 120,
    height: 220
  })
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const copy = await io.writeDocument('fig', graph)
  if (typeof copy.data === 'string') throw new Error('Expected a binary design copy')
  const { graph: reopened } = await io.readDocument({ name: 'Copy.fig', data: copy.data })
  const reopenedPages = reopened.getPages()
  expect(reopenedPages.map((page) => page.name)).toEqual(['Page 1', 'Page 2'])
  expect(reopened.getChildren(reopenedPages[0].id)[0]).toMatchObject({
    fills: [{ type: 'IMAGE' }],
    width: 160,
    height: 100
  })
  expect(reopened.images.size).toBe(1)
})

test('rejects truncated packets and invalid page bounds', () => {
  const bytes = renderedPages()
  expect(() => readRasterPageImages(bytes.subarray(0, -1))).toThrow('invalid page data')
  new DataView(bytes.buffer).setFloat64(4, Infinity, true)
  expect(() => readRasterPageImages(bytes)).toThrow('invalid page data')
})
