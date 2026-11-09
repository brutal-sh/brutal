import { expect, test } from 'bun:test'

import { writePenDocument } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { initializeNote, noteOfNode } from '@open-pencil/scene-graph/generated'

import { computeAllLayouts } from '#core/layout'
import { createLayoutRunner } from '#core/layout/mutations'
import { withTextMeasurer } from '#core/layout/text-measurement'

test('Note height fits wrapped content while authored dimensions survive layout', () => {
  const graph = new SceneGraph()
  const note = graph.createNode('FRAME', graph.getPages()[0].id, { width: 240, height: 30 })
  const body = initializeNote(graph, note, {
    definition: { width: 240, height: 30 },
    content: 'Long content'
  })
  withTextMeasurer(
    (text, width) => {
      expect(text.id).toBe(body.id)
      expect(text.textAutoResize).toBe('HEIGHT')
      expect(width).toBe(202)
      return { width: 202, height: 308 }
    },
    () => computeAllLayouts(graph)
  )
  expect(note).toMatchObject({ width: 250, height: 356, cornerRadius: 24 })
  expect(body).toMatchObject({ x: 24, y: 24, width: 202, height: 308 })
  expect(noteOfNode(note)).toEqual({ width: 240, height: 30 })
  expect(writePenDocument(graph).children[0]).toMatchObject({
    type: 'note',
    width: 240,
    height: 30
  })
})

test('author resizing updates the Note size intent but layout keeps the body minimum', () => {
  const graph = new SceneGraph()
  const note = graph.createNode('FRAME', graph.getPages()[0].id)
  const body = initializeNote(graph, note, { definition: {}, content: 'Small' })
  graph.updateNode(note.id, { width: 480, height: 400 })
  withTextMeasurer(
    () => ({ width: 40, height: 22 }),
    () => computeAllLayouts(graph)
  )
  expect(note).toMatchObject({ width: 480, height: 219 })
  expect(body).toMatchObject({ width: 432, height: 171 })
  expect(noteOfNode(note)).toEqual({ width: 480, height: 400 })
})

test('editing a Note body relays layout to its manually sized Note ancestor', () => {
  const graph = new SceneGraph()
  const note = graph.createNode('FRAME', graph.getPages()[0].id)
  const body = initializeNote(graph, note, { definition: {}, content: 'Short' })
  graph.updateNode(body.id, { text: 'Longer content' })
  withTextMeasurer(
    () => ({ width: 202, height: 308 }),
    () => createLayoutRunner(() => graph).runLayoutForNode(body.id)
  )
  expect(note.height).toBe(356)
  expect(noteOfNode(note)).toEqual({})
})
