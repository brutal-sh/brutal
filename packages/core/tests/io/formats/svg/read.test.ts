import { expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const svg = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" id="Artwork" width="96" height="64"><rect id="Tile" x="8" y="4" width="32" height="16" fill="#2563eb"/></svg>'
)

test('opens SVG and SVGZ with editable vectors and a transparent frame', async () => {
  for (const input of [
    { name: 'art.svg', data: svg },
    { name: 'art.SVGZ', data: Bun.gzipSync(svg) }
  ]) {
    const { graph, sourceFormat } = await io.readDocument(input)
    expect(sourceFormat).toBe('svg')
    const [frame] = graph.getChildren(graph.getPages()[0].id)
    expect(frame).toMatchObject({
      type: 'FRAME',
      name: 'Artwork',
      width: 96,
      height: 64,
      fills: []
    })
    expect(graph.getChildren(frame.id)).toMatchObject([
      { type: 'VECTOR', name: 'Tile', x: 8, y: 4, width: 32, height: 16 }
    ])
  }
  expect(io.findReader('diagram.drawio.svg')?.id).toBe('drawio')
  expect(io.listWritableFormats().some((format) => format.id === 'svg')).toBe(false)
})

test('rejects invalid artwork and bounds both raw and decompressed input', async () => {
  const oversized = new Uint8Array(4 * 1024 * 1024 + 1)
  await expect(io.readDocument({ name: 'invalid.svg', data: new Uint8Array() })).rejects.toThrow(
    'no supported vector or text layers'
  )
  await expect(io.readDocument({ name: 'invalid.svgz', data: svg })).rejects.toThrow(
    'Could not decompress'
  )
  await expect(io.readDocument({ name: 'large.svg', data: oversized })).rejects.toThrow('4 MB')
  await expect(
    io.readDocument({ name: 'large.svgz', data: Bun.gzipSync(oversized) })
  ).rejects.toThrow('after decompression')
})
