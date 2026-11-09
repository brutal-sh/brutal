import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { noteBody } from '@open-pencil/scene-graph/generated'

async function setup() {
  const io = new IORegistry([penFormat])
  const imported = await io.readDocument({
    name: 'detach-notes.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'master',
            type: 'note',
            reusable: true,
            width: 280,
            height: 219,
            content: 'Master',
            color: '#DCC5F9'
          },
          {
            id: 'copy',
            type: 'ref',
            ref: 'master',
            x: 320,
            width: 300,
            content: 'Override',
            color: '#AEDEFF'
          },
          {
            id: 'frame',
            type: 'frame',
            reusable: true,
            width: 400,
            height: 300,
            layout: 'none',
            children: [
              { id: 'nested', type: 'ref', ref: 'master', x: 20, y: 20, content: 'Nested' }
            ]
          },
          {
            id: 'outer',
            type: 'ref',
            ref: 'frame',
            x: 800,
            descendants: { nested: { width: 280, content: 'Nested', color: '#DCC5F9' } }
          }
        ]
      })
    )
  })
  return { io, editor: createEditor({ graph: imported.graph }) }
}

test('detaching a Note instance saves as a plain Note and undo restores the exact reference', async () => {
  const { io, editor } = await setup()
  const before = String((await io.writeDocument('pen', editor.graph)).data)
  const instance = editor.graph.getNode('copy')
  if (!instance) throw new Error('Missing Note instance')
  editor.select([instance.id])
  editor.detachInstance()
  expect(instance.type).toBe('FRAME')
  expect(noteBody(editor.graph, instance)?.componentId).toBeNull()
  const detached = await io.writeDocument('pen', editor.graph)
  const reopened = await io.readDocument({
    name: 'detached.pen',
    data: new TextEncoder().encode(String(detached.data))
  })
  expect(reopened.graph.getNode('copy')).toMatchObject({ type: 'FRAME', width: 300, x: 320 })
  const copy = reopened.graph.getNode('copy')
  expect(copy && noteBody(reopened.graph, copy)?.text).toBe('Override')
  editor.undo.undo()
  expect(String((await io.writeDocument('pen', editor.graph)).data)).toBe(before)
  editor.undo.redo()
  expect(editor.graph.getNode('copy')?.type).toBe('FRAME')
  await io.writeDocument('pen', editor.graph)
})

test('detaching a Note component materializes every instance and is one reversible edit', async () => {
  const { io, editor } = await setup()
  const before = String((await io.writeDocument('pen', editor.graph)).data)
  const noteIds = [...editor.graph.getAllNodes()]
    .filter((n) => noteBody(editor.graph, n))
    .map((n) => n.id)
  editor.detachNoteComponent('master')
  for (const id of noteIds) expect(editor.graph.getNode(id)?.type).toBe('FRAME')
  const saved = String((await io.writeDocument('pen', editor.graph)).data)
  const reopened = await io.readDocument({
    name: 'materialized.pen',
    data: new TextEncoder().encode(saved)
  })
  const copy = reopened.graph.getNode('copy')
  const nested = reopened.graph.getNode('nested')
  expect(copy && noteBody(reopened.graph, copy)?.text).toBe('Override')
  expect(nested && noteBody(reopened.graph, nested)?.text).toBe('Nested')
  const outer = reopened.graph.getNode('outer')
  const outerNote = outer && reopened.graph.getChildren(outer.id).at(0)
  expect(outerNote?.width).toBe(280)
  if (!nested || !outerNote) throw new Error('Missing nested Notes')
  reopened.graph.updateNode(nested.id, { width: 350 })
  reopened.graph.syncInstances('frame')
  expect(outerNote.width).toBe(280)
  editor.undo.undo()
  expect(String((await io.writeDocument('pen', editor.graph)).data)).toBe(before)
  editor.undo.redo()
  expect(String((await io.writeDocument('pen', editor.graph)).data)).toBe(saved)
})

test('read-only Note component detachment refuses mutation', async () => {
  const { io, editor } = await setup()
  const before = String((await io.writeDocument('pen', editor.graph)).data)
  editor.setReadOnly(true)
  expect(() => editor.detachNoteComponent('master')).toThrow('read-only')
  expect(String((await io.writeDocument('pen', editor.graph)).data)).toBe(before)
})

test('a Note copy inside another instance refuses independent detachment as Pen does', async () => {
  const { io, editor } = await setup()
  const outer = editor.graph.getNode('outer')
  const copy = outer && editor.graph.getChildren(outer.id).at(0)
  if (!copy) throw new Error('Missing nested Note copy')
  editor.select([copy.id])
  const before = String((await io.writeDocument('pen', editor.graph)).data)
  editor.detachInstance()
  expect(copy.type).toBe('INSTANCE')
  expect(String((await io.writeDocument('pen', editor.graph)).data)).toBe(before)
})
