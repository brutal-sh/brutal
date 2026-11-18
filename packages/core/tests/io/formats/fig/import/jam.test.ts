import { expect, test } from 'bun:test'

import { unzipSync, zipSync } from 'fflate'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { parseFigBuffer } from '@open-pencil/fig'

const io = new IORegistry(BUILTIN_IO_FORMATS)

test('opens FigJam records and saves the imported layers as a Figma Design copy', async () => {
  const { graph } = await io.readDocument({
    name: 'Example.mmd',
    data: new TextEncoder().encode('graph LR\n  A[Source] --> B[Destination]')
  })
  const fig = await io.writeDocument('fig', graph)
  if (typeof fig.data === 'string') throw new Error('Expected a binary design archive')

  // Synthetic archive with the header used by a FigJam local copy.
  const archive = unzipSync(fig.data)
  archive['canvas.fig'].set(new TextEncoder().encode('fig-jam.'))
  const bytes = zipSync(archive)
  const original = bytes.slice()
  const { graph: imported, sourceFormat } = await io.readDocument({
    name: 'Example.JAM',
    data: bytes
  })

  expect(sourceFormat).toBe('jam')
  const page = imported.getPages()[0]
  const layers = imported.getChildren(page.id)
  expect(layers.map((layer) => layer.type).sort()).toEqual([
    'CONNECTOR',
    'SHAPE_WITH_TEXT',
    'SHAPE_WITH_TEXT'
  ])

  const copy = await io.writeDocument('fig', imported)
  if (typeof copy.data === 'string') throw new Error('Expected a binary design archive')
  expect(parseFigBuffer(new Uint8Array(copy.data).buffer).kind).toBe('design')
  const { graph: reopened } = await io.readDocument({ name: 'Copy.fig', data: copy.data })
  expect(
    reopened.getChildren(reopened.getPages()[0].id).map((layer) => [layer.name, layer.type])
  ).toEqual(layers.map((layer) => [layer.name, layer.type]))
  expect(bytes).toEqual(original)
})

test('rejects an incomplete FigJam canvas header', async () => {
  await expect(
    io.readDocument({ name: 'Broken.jam', data: new TextEncoder().encode('fig-jam.') })
  ).rejects.toThrow()
})
