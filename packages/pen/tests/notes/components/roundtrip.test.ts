import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument, type PenDocument } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { colorToFill, parseColor } from '@open-pencil/scene-graph/color'
import { noteBody, noteOfNode } from '@open-pencil/scene-graph/generated'
import { recordInstanceOverride, syncInstances } from '@open-pencil/scene-graph/instances'

const reference: PenDocument = {
  version: '2.22',
  children: [
    {
      id: 'master',
      type: 'note',
      name: 'Reusable Note',
      reusable: true,
      x: 24,
      y: 24,
      width: 250,
      height: 219,
      content: 'Master Note',
      color: '#DCC5F9'
    },
    { id: 'inherited', type: 'ref', ref: 'master', x: 320, y: 24 },
    {
      id: 'overridden',
      type: 'ref',
      ref: 'master',
      x: 620,
      y: 24,
      width: 300,
      content: 'Override Note',
      color: '#AEDEFF'
    }
  ]
}

function note(graph: SceneGraph, id: string) {
  const node = graph.getNode(id)
  if (!node || !noteOfNode(node)) throw new Error(`Missing Note ${id}`)
  const body = noteBody(graph, node)
  if (!body) throw new Error(`Missing generated body for ${id}`)
  expect(node.childIds).toHaveLength(1)
  return { node, body }
}

test('reusable Notes keep one generated body and linked refs through repeated save/reopen', () => {
  let graph = parsePenFile(JSON.stringify(reference))
  for (let round = 0; round < 3; round++) {
    expect(note(graph, 'master').node.type).toBe('COMPONENT')
    expect(note(graph, 'inherited').node).toMatchObject({ type: 'INSTANCE', componentId: 'master' })
    expect(note(graph, 'inherited').body.text).toBe('Master Note')
    expect(note(graph, 'overridden').body.text).toBe('Override Note')
    expect(note(graph, 'overridden').node.fills).toEqual([colorToFill('#AEDEFF')])
    const output = writePenDocument(graph)
    expect(output.children[0]).toMatchObject({ type: 'note', reusable: true })
    expect(output.children[0].children).toBeUndefined()
    expect(output.children[1]).toMatchObject({ type: 'ref', ref: 'master' })
    expect(output.children[1].descendants).toBeUndefined()
    expect(output.children[2]).toMatchObject({
      type: 'ref',
      content: 'Override Note',
      color: '#AEDEFF',
      width: 300
    })
    expect(output.children[2].descendants).toBeUndefined()
    graph = parsePenFile(JSON.stringify(output))
  }
})

test('master Note text and width edits propagate while instance overrides remain', () => {
  const graph = parsePenFile(JSON.stringify(reference))
  const master = note(graph, 'master')
  graph.updateNode(master.body.id, { text: 'Master revised' })
  graph.updateNode(master.node.id, { width: 280 })
  syncInstances(graph, master.node.id)
  expect(note(graph, 'inherited').body.text).toBe('Master revised')
  expect(note(graph, 'inherited').node).toMatchObject({
    width: 280,
    fills: [colorToFill('#DCC5F9')]
  })
  expect(note(graph, 'overridden').body.text).toBe('Override Note')
  expect(note(graph, 'overridden').node).toMatchObject({
    width: 300,
    fills: [colorToFill('#AEDEFF')]
  })
  const output = writePenDocument(graph)
  expect(output.children[1].width).toBeUndefined()
  expect(output.children[1].content).toBeUndefined()
  expect(output.children[2]).toMatchObject({
    width: 300,
    content: 'Override Note',
    color: '#AEDEFF'
  })
})

test('nested Note overrides use the Note ID without leaking its generated body', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.22',
      children: [
        {
          id: 'frame',
          type: 'frame',
          reusable: true,
          width: 560,
          height: 280,
          layout: 'none',
          children: [
            {
              id: 'note',
              type: 'note',
              x: 20,
              y: 20,
              width: 250,
              content: 'Nested master',
              color: '#FEE484'
            }
          ]
        },
        {
          id: 'instance',
          type: 'ref',
          ref: 'frame',
          descendants: { note: { content: 'Nested override', color: '#FFCC98', width: 300 } }
        }
      ]
    })
  )
  const copy = graph.getChildren('instance')[0]
  expect(note(graph, copy.id).body.text).toBe('Nested override')
  graph.updateNode('note', { width: 260 })
  syncInstances(graph, 'frame')
  expect(note(graph, copy.id).node.width).toBe(300)
  const output = writePenDocument(graph)
  expect(output.children[1].descendants).toEqual({
    note: { content: 'Nested override', color: '#FFCC98', width: 300 }
  })
  const reopened = parsePenFile(JSON.stringify(output))
  expect(note(reopened, reopened.getChildren('instance')[0].id).node.fills[0].color).toEqual(
    parseColor('#FFCC98')
  )
})

test('equal generated-body text overrides remain explicit in saved Note refs', () => {
  const graph = parsePenFile(JSON.stringify(reference))
  const inherited = note(graph, 'inherited')
  recordInstanceOverride(graph, inherited.body.id, ['text'])
  const output = writePenDocument(graph)
  expect(output.children[1].content).toBe('Master Note')
  const reopened = parsePenFile(JSON.stringify(output))
  const master = note(reopened, 'master')
  reopened.updateNode(master.body.id, { text: 'Later master text' })
  syncInstances(reopened, master.node.id)
  expect(note(reopened, 'inherited').body.text).toBe('Master Note')
})
