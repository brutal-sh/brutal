import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { parseColor } from '@open-pencil/scene-graph/color'
import { noteBody, noteOfNode } from '@open-pencil/scene-graph/generated'

test('Note component creation and instances preserve generated ownership and history', () => {
  const editor = createEditor()
  const master = editor.createNote(editor.state.currentPageId, { x: 24, y: 24 })
  const body = noteBody(editor.graph, master)
  if (!body) throw new Error('Missing Note body')
  editor.createComponentFromSelection()
  expect(master.type).toBe('COMPONENT')
  expect(noteOfNode(master)).toBeDefined()
  expect(noteBody(editor.graph, master)?.id).toBe(body.id)
  editor.undo.undo()
  expect(master.type).toBe('FRAME')
  editor.undo.redo()
  const instanceId = editor.createInstanceFromComponent(master.id, 320, 24)
  const instance = instanceId ? editor.graph.getNode(instanceId) : undefined
  if (!instance) throw new Error('Missing Note instance')
  expect(noteOfNode(instance)).toBeDefined()
  expect(instance.childIds).toHaveLength(1)
  expect(noteBody(editor.graph, instance)).toBeDefined()
})

test('Core Note component color, text and size edits preserve instance overrides through save', async () => {
  const io = new IORegistry([penFormat])
  const imported = await io.readDocument({
    name: 'note-components.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'master',
            type: 'note',
            reusable: true,
            width: 250,
            height: 219,
            content: 'Master Note',
            color: '#DCC5F9'
          },
          { id: 'inherited', type: 'ref', ref: 'master', x: 320 },
          {
            id: 'overridden',
            type: 'ref',
            ref: 'master',
            x: 620,
            width: 300,
            content: 'Override Note',
            color: '#AEDEFF'
          }
        ]
      })
    )
  })
  const editor = createEditor({ graph: imported.graph })
  const master = editor.graph.getNode('master')
  const body = master && noteBody(editor.graph, master)
  if (!body) throw new Error('Missing master Note body')
  editor.updateNodeWithUndo(body.id, { text: 'Master revised' })
  editor.setNoteColor(['master'], parseColor('#FFBEB2'))
  editor.updateNodeWithUndo('master', { width: 280 })
  await Promise.resolve()
  const saved = await io.writeDocument('pen', editor.graph)
  const reopened = await io.readDocument({
    name: 'reopened.pen',
    data: new TextEncoder().encode(String(saved.data))
  })
  const inherited = reopened.graph.getNode('inherited')
  const overridden = reopened.graph.getNode('overridden')
  if (!inherited || !overridden) throw new Error('Missing Note instances')
  expect(inherited).toMatchObject({ type: 'INSTANCE', componentId: 'master', width: 280 })
  expect(inherited.fills[0].color).toEqual(parseColor('#FFBEB2'))
  expect(noteBody(reopened.graph, inherited)?.text).toBe('Master revised')
  expect(overridden.width).toBe(300)
  expect(overridden.fills[0].color).toEqual(parseColor('#AEDEFF'))
  expect(noteBody(reopened.graph, overridden)?.text).toBe('Override Note')
})
