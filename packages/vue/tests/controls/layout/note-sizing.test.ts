import { expect, test } from 'bun:test'

import { effectScope } from 'vue'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { writePenDocument } from '@open-pencil/pen'

import { createLayoutActions } from '#vue/controls/layout/helpers'
import { createSelectedNodeState } from '#vue/editor/selection-state/nodes'

test('typing a fixed Note height after Fill saves the entered height while the body stays intrinsic', async () => {
  const imported = await new IORegistry([penFormat]).readDocument({
    name: 'note-field.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'note',
            type: 'note',
            width: 300,
            height: 'fill_container(550)',
            content: 'Keep this'
          }
        ]
      })
    )
  })
  const editor = createEditor({ graph: imported.graph })
  editor.select(['note'])
  const selection = createSelectedNodeState(editor)
  const scope = effectScope()
  const actions = scope.run(() => createLayoutActions({ editor, node: selection.node }))
  if (!actions) throw new Error('Missing layout actions')
  const before = writePenDocument(editor.graph)
  try {
    actions.updateAxisSize('height', 450)
    actions.commitAxisSize('height', 450, 219)
    expect(editor.graph.getNode('note')?.height).toBe(219)
    expect(writePenDocument(editor.graph).children[0]).toMatchObject({
      width: 300,
      height: 450,
      content: 'Keep this'
    })
    editor.undo.undo()
    expect(writePenDocument(editor.graph)).toEqual(before)
    editor.undo.redo()
    expect(writePenDocument(editor.graph).children[0].height).toBe(450)
  } finally {
    scope.stop()
    selection.dispose()
    editor.dispose()
  }
})

for (const axis of ['width', 'height'] as const) {
  test(`typing Note ${axis} while retaining Fill preserves the entered fallback and exact history`, async () => {
    const imported = await new IORegistry([penFormat]).readDocument({
      name: 'note-field-fill.pen',
      data: new TextEncoder().encode(
        JSON.stringify({
          version: '2.22',
          children: [
            {
              id: 'frame',
              type: 'frame',
              layout: 'vertical',
              width: 600,
              height: 500,
              padding: 20,
              children: [
                {
                  id: 'note',
                  type: 'note',
                  width: 'fill_container(300)',
                  height: 'fill_container(550)',
                  content: 'Keep this'
                }
              ]
            }
          ]
        })
      )
    })
    const editor = createEditor({ graph: imported.graph })
    editor.select(['note'])
    const selection = createSelectedNodeState(editor)
    const scope = effectScope()
    const actions = scope.run(() => createLayoutActions({ editor, node: selection.node }))
    if (!actions) throw new Error('Missing layout actions')
    const before = writePenDocument(editor.graph)
    try {
      actions.updateAxisSize(axis, 450, true)
      actions.commitAxisSize(axis, 450, axis === 'width' ? 560 : 219)
      expect(editor.graph.getNode('note')).toMatchObject({ width: 560, height: 219 })
      const after = writePenDocument(editor.graph)
      expect(after.children[0].children?.[0][axis]).toBe('fill_container(450)')
      expect(after.children[0].children?.[0][axis === 'width' ? 'height' : 'width']).toBe(
        axis === 'width' ? 'fill_container(550)' : 'fill_container(300)'
      )
      editor.undo.undo()
      expect(writePenDocument(editor.graph)).toEqual(before)
      editor.undo.redo()
      expect(writePenDocument(editor.graph)).toEqual(after)
    } finally {
      scope.stop()
      selection.dispose()
      editor.dispose()
    }
  })
}
