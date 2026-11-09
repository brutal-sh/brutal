import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument, type PenDocument } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { noteBody } from '@open-pencil/scene-graph/generated'
import { syncInstances, recordInstanceOverride } from '@open-pencil/scene-graph/instances'

const reference: PenDocument = {
  version: '2.22',
  children: [
    {
      id: 'm',
      type: 'note',
      reusable: true,
      width: 250,
      height: 219,
      content: 'Master',
      color: '#FEE484'
    },
    {
      id: 'c',
      type: 'frame',
      reusable: true,
      layout: 'none',
      width: 600,
      height: 300,
      children: [
        { id: 'nr', type: 'ref', ref: 'm', width: 280, content: 'Nested default', color: '#DCC5F9' }
      ]
    },
    {
      id: 'outer',
      type: 'ref',
      ref: 'c',
      descendants: { nr: { width: 300, content: 'Explicit', color: '#AEDEFF' } }
    },
    {
      id: 'equal',
      type: 'ref',
      ref: 'c',
      descendants: { nr: { width: 280, content: 'Nested default', color: '#DCC5F9' } }
    },
    { id: 'untouched', type: 'ref', ref: 'c' }
  ]
}

function copy(graph: SceneGraph, id: string) {
  const node = graph.getChildren(id)[0]
  const body = node && noteBody(graph, node)
  if (!node || !body) throw new Error('Missing nested Note')
  return { node, body }
}

test('equal nested Note overrides remain explicit across repeated save and reopen', () => {
  let graph = parsePenFile(JSON.stringify(reference))
  for (let round = 0; round < 3; round++) {
    const output = writePenDocument(graph)
    expect(output.children.find((node) => node.id === 'equal')?.descendants?.nr).toMatchObject({
      width: 280,
      content: 'Nested default',
      color: '#DCC5F9'
    })
    graph = parsePenFile(JSON.stringify(output))
  }
  const prototype = graph.getNode('nr')
  const body = prototype && noteBody(graph, prototype)
  if (!body) throw new Error('Missing prototype body')
  graph.updateNode('nr', { width: 320 })
  graph.updateNode(body.id, { text: 'Later prototype' })
  syncInstances(graph, 'c')
  expect(copy(graph, 'outer').node.width).toBe(300)
  expect(copy(graph, 'outer').body.text).toBe('Explicit')
  expect(copy(graph, 'equal').node.width).toBe(280)
  expect(copy(graph, 'equal').body.text).toBe('Nested default')
  expect(copy(graph, 'untouched').node.width).toBe(320)
  expect(copy(graph, 'untouched').body.text).toBe('Later prototype')
})

test('Note ref aliases canonicalize to the master and retain source overrides and placement', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.22',
      children: [
        { id: 'm', type: 'note', reusable: true, content: 'Master', width: 250, color: '#FEE484' },
        {
          id: 'r1',
          type: 'ref',
          ref: 'm',
          x: 620,
          y: 24,
          width: 300,
          content: 'Override',
          color: '#AEDEFF'
        },
        { id: 'r2', type: 'ref', ref: 'r1', name: 'Alias' }
      ]
    })
  )
  const alias = graph.getNode('r2')
  expect(alias).toMatchObject({ type: 'INSTANCE', componentId: 'm', x: 620, y: 24, width: 300 })
  expect(alias && noteBody(graph, alias)?.text).toBe('Override')
  expect(writePenDocument(graph).children[2]).toMatchObject({
    type: 'ref',
    ref: 'm',
    x: 620,
    y: 24,
    width: 300,
    content: 'Override',
    color: '#AEDEFF'
  })
})

test('an explicit equal generated-body claim on a nested Note ref survives prototype text edits', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.22',
      children: [
        { id: 'm', type: 'note', reusable: true, content: 'Master' },
        {
          id: 'c',
          type: 'frame',
          reusable: true,
          children: [{ id: 'nr', type: 'ref', ref: 'm', content: 'Proto' }]
        },
        { id: 'out', type: 'ref', ref: 'c' }
      ]
    })
  )
  const copy = graph.getChildren('out').at(0)
  const body = copy && noteBody(graph, copy)
  if (!copy || !body) throw new Error('Missing nested Note')
  recordInstanceOverride(graph, body.id, ['text'])
  const reopened = parsePenFile(JSON.stringify(writePenDocument(graph)))
  const proto = reopened.getNode('nr')
  const protoBody = proto && noteBody(reopened, proto)
  const reopenedCopy = reopened.getChildren('out').at(0)
  if (!protoBody || !reopenedCopy) throw new Error('Missing reopened Note')
  reopened.updateNode(protoBody.id, { text: 'Later prototype' })
  reopened.syncInstances('c')
  expect(noteBody(reopened, reopenedCopy)?.text).toBe('Proto')
})
