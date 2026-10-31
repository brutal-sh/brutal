import { expect, test } from 'bun:test'

import { scriptOfNode, withScript } from '@open-pencil/scene-graph/scripts'

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

test('reusable Scripts retain linked refs, independent source/input claims and derived output', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.21',
      children: [
        {
          type: 'script',
          id: 'main',
          name: 'Reusable Script',
          reusable: true,
          scriptUri: 'grid.js',
          inputs: { count: 3, ink: '#9933CC' }
        },
        { type: 'ref', id: 'own', ref: 'main', name: 'Own inputs', inputs: { count: 2 } },
        { type: 'ref', id: 'equal', ref: 'main', scriptUri: 'grid.js', inputs: {} },
        { type: 'ref', id: 'inherited', ref: 'main' }
      ]
    })
  )
  const main = graph.getNode('main')
  const own = graph.getNode('own')
  const equal = graph.getNode('equal')
  const inherited = graph.getNode('inherited')
  if (!main || !own || !equal || !inherited) throw new Error('Missing Script component fixture.')
  expect(main.type).toBe('COMPONENT')
  expect(own).toMatchObject({ type: 'INSTANCE', componentId: main.id })
  expect(scriptOfNode(own)).toEqual({ uri: 'grid.js', inputs: { count: 2 } })
  expect(own.instanceOverrides.self.has('script/inputs')).toBe(true)
  graph.createNode('RECTANGLE', main.id)
  graph.createNode('ELLIPSE', own.id)
  graph.createNode('RECTANGLE', own.id)
  const before = writePenDocument(graph)
  expect(before.children[0]).toMatchObject({ type: 'script', reusable: true })
  expect(before.children[0].children).toBeUndefined()
  expect(before.children[1]).toMatchObject({ type: 'ref', ref: 'main', inputs: { count: 2 } })
  expect(before.children[2]).toMatchObject({ type: 'ref', scriptUri: 'grid.js', inputs: {} })
  const reopened = parsePenFile(JSON.stringify(before))
  const reopenedOwn = reopened.getNode('own')
  if (!reopenedOwn) throw new Error('Missing reopened Script instance.')
  expect(scriptOfNode(reopenedOwn)).toEqual(scriptOfNode(own))
  graph.updateNode(main.id, {
    pluginData: withScript(main, { uri: 'next.js', inputs: { count: 8 } })
  })
  graph.syncInstances(main.id)
  expect(scriptOfNode(own)).toEqual({ uri: 'next.js', inputs: { count: 2 } })
  expect(scriptOfNode(equal)).toEqual({ uri: 'grid.js', inputs: {} })
  expect(scriptOfNode(inherited)).toEqual({ uri: 'next.js', inputs: { count: 8 } })
  expect(own.childIds).toHaveLength(2)
})
