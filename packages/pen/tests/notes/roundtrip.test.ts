import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { initializeNote } from '@open-pencil/scene-graph/generated'
import { withScript } from '@open-pencil/scene-graph/scripts'

test('a current Pen Note preserves its authored size, color and content through save/reopen', () => {
  const source = {
    version: '2.22',
    children: [
      {
        id: 'note',
        type: 'note',
        name: 'Reference Note',
        x: 24,
        y: 24,
        width: 240,
        height: 30,
        color: '#C9B8F2',
        content: 'Purple note\nSecond line',
        context: 'Keep both lines.'
      }
    ]
  }
  const graph = parsePenFile(JSON.stringify(source))
  const note = graph.getNode('note')
  expect(note).toBeDefined()
  if (!note) throw new Error('Note missing')
  const body = graph.getChildren(note.id)
  expect(body).toHaveLength(1)
  expect(body[0].text).toBe('Purple note\nSecond line')
  const output = writePenDocument(graph)
  expect(output.version).toBe('2.22')
  expect(output.children[0]).toMatchObject({
    id: 'note',
    type: 'note',
    x: 24,
    y: 24,
    width: 240,
    height: 30,
    content: 'Purple note\nSecond line',
    context: 'Keep both lines.'
  })
  expect(output.children[0].children).toBeUndefined()
  const reopened = parsePenFile(JSON.stringify(output))
  const restored = reopened.getNode('note')
  expect(restored?.fills[0].color).toEqual(note.fills[0].color)
  expect(reopened.getChildren('note')[0].text).toBe('Purple note\nSecond line')
  expect(source.children[0].width).toBe(240)
})

test('unqualified legacy Note text styles remain an explicit import error', () => {
  expect(() =>
    parsePenFile(
      JSON.stringify({
        version: '2.21',
        children: [{ id: 'old', type: 'note', content: 'Preserve this', fontFamily: 'Custom face' }]
      })
    )
  ).toThrow()
})

test('derived Script Notes do not upgrade a document that serializes no authored Notes', () => {
  const graph = new SceneGraph()
  const script = graph.createNode('FRAME', graph.getPages()[0].id)
  graph.updateNode(script.id, { pluginData: withScript(script, { uri: 'render.js', inputs: {} }) })
  const note = graph.createNode('FRAME', script.id)
  initializeNote(graph, note, { definition: {}, content: 'Derived output' })
  const output = writePenDocument(graph)
  expect(output.version).toBe('2.21')
  expect(output.children[0].type).toBe('script')
  expect(output.children[0].children).toBeUndefined()
})
