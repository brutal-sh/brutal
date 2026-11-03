import { expect, test } from 'bun:test'

import { effectScope } from 'vue'

import { createEditor } from '@open-pencil/core'
import { authoredLayoutSizing, authoredLayoutSizingUpdates } from '@open-pencil/scene-graph/layout'

import { createLayoutActions } from '#vue/controls/layout/helpers'
import { createSelectedNodeState } from '#vue/editor/selection-state/nodes'

test.each(['FRAME', 'RECTANGLE'] as const)(
  'a ratio-locked %s size edit fixes both authored Hug axes through Undo and Redo',
  (type) => {
    const editor = createEditor()
    const frame = editor.graph.createNode(type, editor.state.currentPageId, {
      width: 80,
      height: 40,
      targetAspectRatio: { x: 80, y: 40 }
    })
    for (const axis of ['HORIZONTAL', 'VERTICAL'] as const)
      editor.graph.updateNode(
        frame.id,
        authoredLayoutSizingUpdates(editor.graph, frame, axis, 'HUG')
      )
    editor.select([frame.id])
    const selection = createSelectedNodeState(editor)
    const scope = effectScope()
    const actions = scope.run(() => createLayoutActions({ editor, node: selection.node }))
    if (!actions) throw new Error('Layout actions unavailable')
    const sizing = () => [
      authoredLayoutSizing(editor.graph, frame, 'HORIZONTAL'),
      authoredLayoutSizing(editor.graph, frame, 'VERTICAL')
    ]
    try {
      expect(sizing()).toEqual(['HUG', 'HUG'])
      actions.updateAxisSize('width', 120)
      actions.commitAxisSize('width', 120, 80)
      expect(frame).toMatchObject({ width: 120, height: 60 })
      expect(sizing()).toEqual(['FIXED', 'FIXED'])
      editor.undoAction()
      expect(frame).toMatchObject({ width: 80, height: 40 })
      expect(sizing()).toEqual(['HUG', 'HUG'])
      editor.redoAction()
      expect(sizing()).toEqual(['FIXED', 'FIXED'])
    } finally {
      scope.stop()
      selection.dispose()
      editor.dispose()
    }
  }
)
