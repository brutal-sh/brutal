import { expect, test } from 'bun:test'

import { IORegistry, penFormat } from '@open-pencil/core/io'
import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit
} from '@open-pencil/core/io/formats/raster'

import { noteReferenceDocument } from './fixtures/notes'

test('Notes imported and reopened through Core match the native Pen reference pixels', async () => {
  const io = new IORegistry([penFormat])
  const imported = await io.readDocument({
    name: 'notes.pen',
    data: new TextEncoder().encode(JSON.stringify(noteReferenceDocument))
  })
  expect(imported.graph.getNode('gold')).toMatchObject({ width: 250, height: 219 })
  expect(imported.graph.getNode('long')).toMatchObject({ width: 300, height: 356 })
  const codec = createCanvasKitRasterCodec(await initCanvasKit())
  const reference = codec.decode(
    await Bun.file(new URL('./fixtures/notes-reference.png', import.meta.url)).bytes()
  )
  if (!reference) throw new Error('Native reference cannot be decoded')
  const output = await io.writeDocument('pen', imported.graph)
  const reopened = await io.readDocument({
    name: 'reopened.pen',
    data: new TextEncoder().encode(String(output.data))
  })
  for (const graph of [imported.graph, reopened.graph]) {
    const png = await headlessRenderNodes(graph, graph.getPages()[0].id, ['reference'])
    const rendered = png && codec.decode(png)
    if (!rendered) throw new Error('Notes did not render')
    expect([rendered.width, rendered.height]).toEqual([reference.width, reference.height])
    let changedChannels = 0
    for (let i = 0; i < reference.data.length; i++) {
      if (reference.data[i] !== rendered.data[i]) changedChannels++
    }
    expect(changedChannels).toBe(0)
  }
})
