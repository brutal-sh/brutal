import { expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { OPEN_PENCIL_PLUGIN_DATA, readPluginData } from '@open-pencil/scene-graph/plugin-data'

test('node context survives Pen to FIG to Pen save and reopen', async () => {
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const source = new TextEncoder().encode(
    JSON.stringify({
      version: '2.21',
      children: [
        {
          id: 'annotated',
          type: 'frame',
          name: 'Annotated',
          width: 'fill_container(200)',
          height: 100,
          context: 'Retain design intent.'
        }
      ]
    })
  )
  const imported = await io.readDocument({ name: 'context.pen', data: source })
  const fig = await io.writeDocument('fig', imported.graph)
  if (!(fig.data instanceof Uint8Array)) throw new Error('Expected FIG archive bytes')
  const reopened = await io.readDocument({ name: 'context.fig', data: fig.data })
  const annotated = [...reopened.graph.nodes.values()].filter(
    (node) => node.type === 'FRAME' && node.name === 'Annotated'
  )
  expect(annotated).toHaveLength(1)
  expect(readPluginData(annotated[0].pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)).toBe(
    'Retain design intent.'
  )
  const pen = await io.writeDocument('pen', reopened.graph)
  expect(typeof pen.data === 'string' && pen.data.includes('fill_container(200)')).toBe(true)
  const roundTrip = await io.readDocument({
    name: 'roundtrip.pen',
    data: typeof pen.data === 'string' ? new TextEncoder().encode(pen.data) : pen.data
  })
  const finalNode = [...roundTrip.graph.nodes.values()].find(
    (node) => node.type === 'FRAME' && node.name === 'Annotated'
  )
  expect(finalNode).toBeDefined()
  expect(readPluginData(finalNode?.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)).toBe(
    'Retain design intent.'
  )
})
