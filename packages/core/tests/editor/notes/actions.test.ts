import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { colorToFill, parseColor } from '@open-pencil/scene-graph/color'
import { copyFills } from '@open-pencil/scene-graph/copy'
import { noteBody, noteOfNode, noteForeground } from '@open-pencil/scene-graph/generated'
import { ownsSlotContent, slotPropertyId } from '@open-pencil/scene-graph/slots'

test('a new Pen Note is selected and its whole subtree survives undo and redo', () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 20, y: 30 })
  expect(note).toMatchObject({ type: 'FRAME', name: 'Note', x: 20, y: 30, width: 250, height: 219 })
  expect(noteOfNode(note)).toEqual({})
  expect(noteBody(editor.graph, note)?.text).toBe('')
  expect([...editor.state.selectedIds]).toEqual([note.id])
  editor.undo.undo()
  expect(editor.graph.getNode(note.id)).toBeUndefined()
  editor.undo.redo()
  const restored = editor.graph.getNode(note.id)
  expect(restored && noteBody(editor.graph, restored)?.text).toBe('')
})

test('changing Note color updates its derived foreground and undoes as one step', () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 0, y: 0 })
  const original = copyFills(note.fills)
  const purple = parseColor('#C9B8F2')
  editor.setNoteColor([note.id], purple)
  expect(editor.graph.getNode(note.id)?.fills).toEqual([colorToFill(purple)])
  expect(noteBody(editor.graph, note)?.fills).toEqual([colorToFill(noteForeground(purple))])
  editor.undo.undo()
  expect(editor.graph.getNode(note.id)?.fills).toEqual(original)
  editor.undo.redo()
  expect(editor.graph.getNode(note.id)?.fills).toEqual([colorToFill(purple)])
})

test('choosing the existing Note color adds no undo step', () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 0, y: 0 })
  editor.setNoteColor([note.id], parseColor('#FEE484'))
  editor.undo.undo()
  expect(editor.graph.getNode(note.id)).toBeUndefined()
})

test('read-only mode refuses Note creation and paint changes', () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 0, y: 0 })
  const before = copyFills(note.fills)
  editor.setReadOnly(true)
  expect(() => editor.createNote(editor.state.currentPageId, { x: 300, y: 0 })).toThrow(/read-only/)
  expect(() => editor.setNoteColor([note.id], parseColor('#C9B8F2'))).toThrow(/read-only/)
  expect(note.fills).toEqual(before)
  expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(1)
})

test('creating a Note claims an instance slot and undoes its ownership in the same step', () => {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const component = editor.graph.createNode('COMPONENT', page, {
    componentPropertyDefinitions: [{ id: 'body', name: 'Body', type: 'SLOT', defaultValue: '' }]
  })
  editor.graph.createNode('FRAME', component.id, {
    componentPropertyReferences: [{ propertyId: 'body', field: 'SLOT_CONTENT' }]
  })
  const instance = editor.graph.createInstance(component.id, page)
  if (!instance) throw new Error('Expected instance')
  const slot = editor.graph.getChildren(instance.id).find((node) => slotPropertyId(node))
  if (!slot) throw new Error('Expected slot')
  const note = editor.createNote(slot.id, { x: 0, y: 0 })
  expect(ownsSlotContent(editor.graph, slot)).toBe(true)
  editor.undo.undo()
  const restored = editor.graph.getNode(slot.id)
  if (!restored) throw new Error('Expected restored slot')
  expect(ownsSlotContent(editor.graph, restored)).toBe(false)
  expect(editor.graph.getNode(note.id)).toBeUndefined()
  editor.undo.redo()
  expect(ownsSlotContent(editor.graph, restored)).toBe(true)
  expect(editor.graph.getNode(note.id)).toBeDefined()
  const before = editor.graph.nodes.size
  expect(() => editor.createNote(instance.id, { x: 0, y: 0 })).toThrow(/locked/)
  expect(editor.graph.nodes.size).toBe(before)
  expect(editor.undo.isBatching).toBe(false)
})
