import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { parseColor } from '@open-pencil/scene-graph/color'
import { copyFills } from '@open-pencil/scene-graph/copy'
import { noteBody } from '@open-pencil/scene-graph/generated'

test('canceling Note color preview restores background, foreground and binding', () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 0, y: 0 })
  const collection = editor.graph.createCollection('Colors')
  const variable = editor.graph.createVariable(
    'Note',
    'COLOR',
    collection.id,
    parseColor('#FEE484')
  )
  editor.graph.bindVariable(note.id, 'fills/0/color', variable.id)
  const before = copyFills(note.fills)
  const bodyBefore = copyFills(noteBody(editor.graph, note)?.fills ?? [])
  const preview = editor.beginNoteColorPreview([note.id])
  preview.update(parseColor('#C9B8F2'))
  expect(note.boundVariables['fills/0/color']).toBeUndefined()
  expect(note.fills).not.toEqual(before)
  preview.cancel()
  expect(note.fills).toEqual(before)
  expect(noteBody(editor.graph, note)?.fills).toEqual(bodyBefore)
  expect(note.boundVariables['fills/0/color']).toBe(variable.id)
  editor.undo.undo()
  expect(editor.graph.getNode(note.id)).toBeUndefined()
})

test('several preview colors commit as one undo step', () => {
  const editor = createEditor()
  const note = editor.createNote(editor.state.currentPageId, { x: 0, y: 0 })
  const before = copyFills(note.fills)
  const preview = editor.beginNoteColorPreview([note.id])
  preview.update(parseColor('#C9B8F2'))
  preview.update(parseColor('#AEDEFF'))
  preview.commit()
  editor.undo.undo()
  expect(note.fills).toEqual(before)
  editor.undo.redo()
  expect(note.fills[0].color).toEqual(parseColor('#AEDEFF'))
})

test('selection changes cancel a Note color preview and ignore late updates', () => {
  const editor = createEditor()
  const first = editor.createNote(editor.state.currentPageId, { x: 0, y: 0 })
  const second = editor.createNote(editor.state.currentPageId, { x: 300, y: 0 })
  editor.select([first.id])
  const before = copyFills(first.fills)
  const preview = editor.beginNoteColorPreview([first.id])
  preview.update(parseColor('#C9B8F2'))
  editor.select([second.id])
  expect(preview.closed).toBe(true)
  preview.update(parseColor('#AEDEFF'))
  expect(first.fills).toEqual(before)
  expect(second.fills).toEqual(before)
})
