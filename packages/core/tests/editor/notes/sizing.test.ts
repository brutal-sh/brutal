import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { writePenDocument } from '@open-pencil/pen'
import { noteOfNode } from '@open-pencil/scene-graph/generated'
import { syncInstances } from '@open-pencil/scene-graph/instances'
import { authoredLayoutSizingUpdates } from '@open-pencil/scene-graph/layout'

async function fixture(layout: 'horizontal' | 'vertical' = 'vertical') {
  const io = new IORegistry([penFormat])
  const imported = await io.readDocument({
    name: 'note-editor-sizing.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'frame',
            type: 'frame',
            layout,
            width: 600,
            height: 500,
            padding: 20,
            children: [
              { id: 'note', type: 'note', width: 300, height: 400, content: 'Keep the text' }
            ]
          }
        ]
      })
    )
  })
  const editor = createEditor({ graph: imported.graph })
  const node = editor.graph.getNode('note')
  if (!node) throw new Error('Missing Note')
  editor.select([node.id])
  return { editor, node }
}

function output(editor: ReturnType<typeof createEditor>) {
  return writePenDocument(editor.graph).children[0].children?.[0]
}

for (const axis of ['HORIZONTAL', 'VERTICAL'] as const) {
  test(`Note ${axis} Fill/fixed edits retain the other authored axis and exact Undo/Redo`, async () => {
    const { editor, node } = await fixture(axis === 'HORIZONTAL' ? 'vertical' : 'horizontal')
    const before = writePenDocument(editor.graph)
    const fill = editor.beginNodePreview('Fill Note')
    fill.update(node.id, authoredLayoutSizingUpdates(editor.graph, node, axis, 'FILL'))
    fill.commit()
    const dimension = axis === 'HORIZONTAL' ? 'width' : 'height'
    const other = axis === 'HORIZONTAL' ? 'height' : 'width'
    expect(output(editor)?.[dimension]).toMatch(/^fill_container/)
    expect(output(editor)?.[other]).toBe(axis === 'HORIZONTAL' ? 400 : 300)
    const filled = writePenDocument(editor.graph)
    const fixed = editor.beginNodePreview('Fix Note')
    fixed.update(node.id, authoredLayoutSizingUpdates(editor.graph, node, axis, 'FIXED'))
    fixed.commit()
    expect(output(editor)?.[dimension]).toBe(axis === 'HORIZONTAL' ? 560 : 219)
    const after = writePenDocument(editor.graph)
    editor.undo.undo()
    expect(writePenDocument(editor.graph)).toEqual(filled)
    editor.undo.redo()
    expect(writePenDocument(editor.graph)).toEqual(after)
    editor.undo.undo()
    editor.undo.undo()
    expect(writePenDocument(editor.graph)).toEqual(before)
  })
}

test('canceling Note Fill restores geometry, authored dimensions and the serialized document', async () => {
  const { editor, node } = await fixture()
  const before = writePenDocument(editor.graph)
  const preview = editor.beginNodePreview('Fill Note')
  preview.update(node.id, authoredLayoutSizingUpdates(editor.graph, node, 'HORIZONTAL', 'FILL'))
  expect(node.width).toBe(560)
  preview.cancel()
  expect(node.width).toBe(300)
  expect(writePenDocument(editor.graph)).toEqual(before)
})

test('read-only Note sizing refuses mutation before geometry or authored intent changes', async () => {
  const { editor, node } = await fixture()
  const before = writePenDocument(editor.graph)
  editor.setReadOnly(true)
  expect(() => {
    const preview = editor.beginNodePreview('Fill Note')
    preview.update(node.id, authoredLayoutSizingUpdates(editor.graph, node, 'HORIZONTAL', 'FILL'))
  }).toThrow(/read.only/i)
  expect(writePenDocument(editor.graph)).toEqual(before)
})

test('a Note instance keeps Fill width intent while inheriting later master height edits', async () => {
  const imported = await new IORegistry([penFormat]).readDocument({
    name: 'note-instance-fill.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'master',
            type: 'note',
            reusable: true,
            width: 300,
            height: 400,
            content: 'Master'
          },
          {
            id: 'frame',
            type: 'frame',
            layout: 'vertical',
            width: 600,
            height: 500,
            padding: 20,
            children: [{ id: 'instance', type: 'ref', ref: 'master' }]
          }
        ]
      })
    )
  })
  const editor = createEditor({ graph: imported.graph })
  const instance = editor.graph.getNode('instance')
  if (!instance) throw new Error('Missing Note instance')
  const preview = editor.beginNodePreview('Fill instance')
  preview.update(
    instance.id,
    authoredLayoutSizingUpdates(editor.graph, instance, 'HORIZONTAL', 'FILL')
  )
  preview.commit()
  editor.graph.updateNode('master', { height: 450 })
  syncInstances(editor.graph, 'master')
  expect(noteOfNode(instance)).toEqual({ width: 'fill_container(300)', height: 450 })
  expect(writePenDocument(editor.graph).children[1].children?.[0]).toMatchObject({
    type: 'ref',
    ref: 'master',
    width: 'fill_container(300)'
  })
})
