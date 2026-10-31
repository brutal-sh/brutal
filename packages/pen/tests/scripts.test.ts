import { expect, test } from 'bun:test'

import { scriptOfNode } from '@open-pencil/scene-graph/scripts'

import { parsePenFile } from '../src/read'
import { writePenDocument } from '../src/write'

const source = JSON.stringify({
  version: '2.21',
  children: [
    {
      type: 'script',
      id: 'script-probe',
      scriptUri: './grid.js',
      inputs: { count: 9, filled: true, ink: '$primary' }
    }
  ]
})

test('Script source and authored inputs round trip without serializing derived children', () => {
  const graph = parsePenFile(source)
  const node = graph.getNode('script-probe')
  if (!node) throw new Error('Missing Script fixture.')
  expect(node).toMatchObject({ type: 'FRAME', width: 200, height: 200 })
  expect(scriptOfNode(node)).toEqual({
    uri: './grid.js',
    inputs: { count: 9, filled: true, ink: '$primary' }
  })
  graph.createNode('RECTANGLE', node.id, { width: 34, height: 170 })
  const written = writePenDocument(graph)
  expect(written.children[0]).toMatchObject({
    type: 'script',
    scriptUri: './grid.js',
    inputs: { count: 9 }
  })
  expect(written.children[0].children).toBeUndefined()
  const reopened = parsePenFile(JSON.stringify(written)).getNode(node.id)
  if (!reopened) throw new Error('Missing reopened Script.')
  expect(scriptOfNode(reopened)).toEqual(scriptOfNode(node))
  expect(reopened.childIds).toEqual([])
})
