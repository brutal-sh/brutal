import { afterEach, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@open-pencil/core'
import { noteBody } from '@open-pencil/scene-graph/generated'

import { startNotePlacement } from '#vue/shared/input/notes/place'

let editor: Editor

afterEach(() => editor.dispose())

function setup() {
  editor = createEditor()
  editor.setTool('NOTE')
  return editor.state.currentPageId
}

test('a Pen Note is centered at the fractional press and immediately edits its body', () => {
  setup()
  const note = startNotePlacement(100.25, 200.75, editor)
  expect(note).toMatchObject({ x: -24.75, y: 91.25, width: 250, height: 219 })
  expect(editor.state.activeTool).toBe('SELECT')
  const body = noteBody(editor.graph, note)
  if (!body) throw new Error('Expected Note body')
  expect(editor.state.editingTextId).toBe(body.id)
  expect(editor.undo.isBatching).toBe(false)
  editor.commitTextEdit()
  editor.undo.undo()
  expect(editor.graph.getNode(note.id)).toBeUndefined()
  editor.undo.redo()
  expect(editor.graph.getNode(note.id)).toMatchObject({ width: 250, height: 219 })
})

test('a Note is centered in the local axes of the frame under the press', () => {
  const page = setup()
  const frame = editor.graph.createNode('FRAME', page, {
    x: 100,
    y: 260,
    width: 920,
    height: 500
  })
  const note = startNotePlacement(400, 600, editor)
  expect(note).toMatchObject({ parentId: frame.id, x: 175, y: 230.5 })
})

test('Note placement leaves later independent edits and selections outside its undo step', () => {
  const page = setup()
  const previous = editor.createShape('RECTANGLE', -300, -300, 20, 20, page)
  editor.select([previous])
  const note = startNotePlacement(300, 300, editor)
  editor.commitTextEdit()
  const next = editor.createShape('RECTANGLE', -200, -200, 20, 20, page)
  editor.select([next])
  expect(editor.undo.isBatching).toBe(false)
  expect([...editor.state.selectedIds]).toEqual([next])
  editor.undo.undo()
  expect(editor.graph.getNode(next)).toBeUndefined()
  expect(editor.graph.getNode(note.id)).toBeDefined()
  editor.undo.undo()
  expect(editor.graph.getNode(note.id)).toBeUndefined()
  expect([...editor.state.selectedIds]).toEqual([previous])
})

test('read-only placement refuses the edit without opening an undo batch', () => {
  const page = setup()
  editor.setReadOnly(true)
  expect(() => startNotePlacement(300, 300, editor)).toThrow(/read-only/)
  expect(editor.undo.isBatching).toBe(false)
  expect(editor.graph.getChildren(page)).toHaveLength(0)
})
