import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument, PenExportError } from '@open-pencil/pen'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

test('context survives import, editing, export and reopen alongside node content', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.21',
      children: [
        {
          id: 'card',
          type: 'frame',
          width: 200,
          height: 100,
          context: 'Use a calm voice.\nPreserve accessibility.'
        }
      ]
    })
  )
  const node = graph.getNode('card')
  expect(node).toBeDefined()
  expect(readPluginData(node?.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)).toBe(
    'Use a calm voice.\nPreserve accessibility.'
  )
  if (!node) throw new Error('Missing frame')
  graph.updateNode(node.id, {
    pluginData: withPluginData(
      node.pluginData,
      OPEN_PENCIL_PLUGIN_DATA.nodeContext,
      'Updated context'
    )
  })
  const output = writePenDocument(graph)
  expect(output.children[0].context).toBe('Updated context')
  const reopened = parsePenFile(JSON.stringify(output))
  expect(
    readPluginData(reopened.getNode('card')?.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)
  ).toBe('Updated context')
  graph.updateNode(node.id, {
    pluginData: [...node.pluginData, { pluginId: 'other', key: 'custom', value: 'preserve' }]
  })
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
})

test('component occurrence context overrides the source without changing it', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.21',
      children: [
        { id: 'main', type: 'frame', reusable: true, width: 100, height: 50, context: 'source' },
        { id: 'copy', type: 'ref', ref: 'main', context: 'occurrence' }
      ]
    })
  )
  expect(
    readPluginData(graph.getNode('main')?.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)
  ).toBe('source')
  expect(
    readPluginData(graph.getNode('copy')?.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeContext)
  ).toBe('occurrence')
  const output = writePenDocument(graph)
  const copy = output.children.find((node) => node.id === 'copy')
  expect(copy?.context).toBe('occurrence')
})

test('malformed context metadata is rejected instead of silently dropped', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.21',
      children: [{ id: 'item', type: 'rectangle', width: 10, height: 10 }]
    })
  )
  graph.updateNode('item', {
    pluginData: [
      { pluginId: 'open-pencil', key: OPEN_PENCIL_PLUGIN_DATA.nodeContext.key, value: '{broken' }
    ]
  })
  expect(() => writePenDocument(graph)).toThrow(PenExportError)
})
