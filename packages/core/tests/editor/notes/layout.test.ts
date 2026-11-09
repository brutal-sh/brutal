import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'

test('Note flex layout wraps fixed content with native padding and one undo step', async () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 20, y: 30 })
  const frameId = editor.wrapNoteInAutoLayout()
  if (!frameId) throw new Error('Expected Note wrapper')
  const expected = {
    name: 'Frame 1',
    x: 10,
    y: 20,
    width: 270,
    height: 239,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    itemSpacing: 10
  }
  expect(editor.graph.getNode(frameId)).toMatchObject(expected)
  expect(note).toMatchObject({
    parentId: frameId,
    x: 10,
    y: 10,
    width: 250,
    height: 219,
    layoutMode: 'NONE'
  })
  editor.undo.undo()
  expect(editor.graph.getNode(frameId)).toBeUndefined()
  expect(note).toMatchObject({ x: 20, y: 30, parentId: editor.state.currentPageId })
  expect(editor.state.selectedIds.size).toBe(0)
  editor.undo.redo()
  expect(editor.graph.getNode(frameId)).toMatchObject(expected)
  expect(note).toMatchObject({ parentId: frameId, x: 10, y: 10 })
  const io = new IORegistry([penFormat])
  const output = await io.writeDocument('pen', editor.graph)
  const reopened = await io.readDocument({
    name: 'note-layout.pen',
    data: new TextEncoder().encode(String(output.data))
  })
  expect(reopened.graph.getNode(frameId)).toMatchObject(expected)
  expect(reopened.graph.getNode(note.id)).toMatchObject({
    parentId: frameId,
    x: 10,
    y: 10,
    width: 250,
    height: 219
  })
  expect(reopened.graph.getChildren(note.id)).toHaveLength(1)
})

test('Note wrapping refuses read-only edits and leaves other selections alone', () => {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const rectangle = editor.graph.createNode('RECTANGLE', page)
  editor.select([rectangle.id])
  expect(editor.wrapNoteInAutoLayout()).toBeNull()
  editor.createNote(page, { x: 0, y: 0 })
  editor.setReadOnly(true)
  expect(() => editor.wrapNoteInAutoLayout()).toThrow(/read-only/)
  expect(editor.graph.getChildren(page)).toHaveLength(2)
})

for (const dimensions of [{}, { width: 240, height: 30 }]) {
  test(`wrapping and undo preserve authored Note dimensions ${JSON.stringify(dimensions)}`, async () => {
    const io = new IORegistry([penFormat])
    const imported = await io.readDocument({
      name: 'authored-note.pen',
      data: new TextEncoder().encode(
        JSON.stringify({
          version: '2.22',
          children: [{ type: 'note', id: 'note', x: 20, y: 30, content: '', ...dimensions }]
        })
      )
    })
    const editor = createEditor({ graph: imported.graph })
    editor.select(['note'])
    const before = await io.writeDocument('pen', editor.graph)
    editor.wrapNoteInAutoLayout()
    editor.undo.undo()
    expect((await io.writeDocument('pen', editor.graph)).data).toEqual(before.data)
    editor.undo.redo()
    editor.undo.undo()
    expect((await io.writeDocument('pen', editor.graph)).data).toEqual(before.data)
  })
}
