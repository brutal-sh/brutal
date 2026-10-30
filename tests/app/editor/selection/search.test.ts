import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { findLayers } from '@/app/editor/selection/search'

test('finds names, text and IDs within the current page, preserving nested layer order', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const group = graph.createNode('FRAME', page.id, { name: 'Match parent' })
  const text = graph.createNode('TEXT', group.id, {
    name: 'Caption',
    text: 'MATCH in content',
    visible: false
  })
  const other = graph.addPage('Other')
  graph.createNode('RECTANGLE', other.id, { name: 'Match elsewhere' })
  expect(findLayers(graph, page.id, ' match ').map((node) => node.id)).toEqual([group.id, text.id])
  expect(findLayers(graph, page.id, text.id).map((node) => node.id)).toEqual([text.id])
  expect(findLayers(graph, page.id, '  ')).toEqual([])
  expect(findLayers(graph, page.id, 'not present')).toEqual([])
  graph.updateNode(text.id, { text: 'Edited content' })
  expect(findLayers(graph, page.id, 'match').map((node) => node.id)).toEqual([group.id])
})
