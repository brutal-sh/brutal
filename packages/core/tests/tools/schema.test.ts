import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS, defineTool } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

const tool = defineTool({
  name: 'place_box',
  description: 'Places a box',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    kind: v.picklist(['FRAME', 'RECTANGLE']),
    width: v.pipe(v.number(), v.minValue(1))
  }),
  execute: (_figma, args) => args
})

function builtIn(name: string) {
  const def = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!def) throw new Error(`Missing tool ${name}`)
  return def
}

describe('tool arguments', () => {
  test('name the tool and list every problem with its argument', () => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(() => tool.execute(figma, { kind: 'CIRCLE', width: 0 })).toThrow(
      [
        'Invalid arguments for place_box:',
        '× Invalid type: Expected ("FRAME" | "RECTANGLE") but received "CIRCLE"',
        '  → at kind',
        '× Invalid value: Expected >=1 but received 0',
        '  → at width'
      ].join('\n')
    )
  })

  test('pass valid arguments through', () => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(tool.execute(figma, { kind: 'FRAME', width: 10 })).toEqual({ kind: 'FRAME', width: 10 })
  })

  test('reject arguments the tool does not take instead of dropping them', () => {
    const figma = new FigmaAPI(new SceneGraph())
    expect(() => tool.execute(figma, { kind: 'FRAME', width: 10, height: 10 })).toThrow(
      'Invalid arguments for place_box'
    )

    // Mis-nested calls that once succeeded as no-ops.
    const rect = figma.createRectangle()
    expect(() =>
      builtIn('update_node').execute(figma, { id: rect.id, properties: { x: 0, y: 500 } })
    ).toThrow('Invalid arguments for update_node')
    expect(rect.y).toBe(0)
    const text = figma.createText()
    expect(() =>
      builtIn('set_font').execute(figma, { id: text.id, font: { family: 'Verdana' } })
    ).toThrow('Invalid arguments for set_font')
  })
})

test('read tools expose stored node context to the design agent', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const node = graph.createNode('FRAME', page.id, { name: 'Annotated' })
  graph.updateNode(node.id, {
    pluginData: withPluginData(
      node.pluginData,
      OPEN_PENCIL_PLUGIN_DATA.nodeContext,
      'Use the supplied design constraints.'
    )
  })
  const figma = new FigmaAPI(graph)
  expect(builtIn('get_node').execute(figma, { id: node.id })).toMatchObject({
    context: 'Use the supplied design constraints.'
  })
  expect(builtIn('get_page_tree').execute(figma, {})).toMatchObject({
    children: [{ id: node.id, context: 'Use the supplied design constraints.' }]
  })
})
