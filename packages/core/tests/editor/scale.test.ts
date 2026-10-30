import { describe, expect, test, spyOn } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { createSceneGeometry } from '@open-pencil/core/geometry'

function fixture() {
  const editor = createEditor()
  const frame = editor.graph.createNode('FRAME', editor.state.currentPageId, {
    x: 100,
    y: 100,
    width: 200,
    height: 100
  })
  const text = editor.graph.createNode('TEXT', frame.id, {
    x: 20,
    y: 10,
    width: 80,
    height: 30,
    text: 'Scale me',
    fontSize: 16,
    textAutoResize: 'NONE',
    cornerRadius: 4,
    strokes: [
      {
        type: 'SOLID',
        color: { r: 1, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        weight: 2,
        align: 'CENTER'
      }
    ]
  })
  editor.select([frame.id])
  return { editor, frame, text }
}

describe('proportional selection scale', () => {
  test('returning to the original scale leaves no changes or Undo entry', () => {
    const { editor, frame, text } = fixture()
    try {
      const before = structuredClone([frame, text])
      const gesture = editor.beginScaleNodes([frame.id], { x: 100, y: 100 })
      gesture.update(2)
      gesture.update(1)
      gesture.commit()
      expect([frame, text]).toEqual(before)
      expect(editor.undo.canUndo).toBe(false)
    } finally {
      editor.dispose()
    }
  })

  test('a commit failure rolls back earlier writes and creates no Undo entry', () => {
    const { editor, frame, text } = fixture()
    const before = structuredClone([frame, text])
    const gesture = editor.beginScaleNodes([frame.id], { x: 100, y: 100 })
    gesture.update(2)
    const original = editor.graph.updateNode.bind(editor.graph)
    const write = spyOn(editor.graph, 'updateNode').mockImplementation((id, changes) => {
      if (id === text.id && changes.fontSize === 32) throw new Error('Commit failure')
      return original(id, changes)
    })
    try {
      expect(() => gesture.commit()).toThrow('Commit failure')
      expect([frame, text]).toEqual(before)
      expect(editor.undo.canUndo).toBe(false)
      expect(editor.isInteractiveEditing()).toBe(false)
    } finally {
      write.mockRestore()
      editor.dispose()
    }
  })

  test('bound values keep their scaled units and instances retain their occurrence scale', () => {
    const editor = createEditor()
    try {
      const collection = editor.graph.createCollection('Spacing')
      const variable = editor.graph.createVariable('Padding', 'FLOAT', collection.id, 10)
      const instance = editor.graph.createNode('INSTANCE', editor.state.currentPageId, {
        width: 100,
        height: 100,
        paddingLeft: 10,
        boundVariables: { paddingLeft: variable.id }
      })
      const child = editor.graph.createNode('RECTANGLE', instance.id, {
        x: 10,
        width: 20,
        height: 20
      })
      const gesture = editor.beginScaleNodes([instance.id], { x: 0, y: 0 })
      gesture.update(2)
      gesture.commit()
      expect([
        instance.componentScale,
        child.componentScale,
        instance.paddingLeft,
        child.width
      ]).toEqual([2, 2, 20, 40])
      expect(instance.boundVariables.paddingLeft).toBe(variable.id)
      expect(instance.variableBindingScales.paddingLeft).toBe(2)
      editor.updateVariableValue(variable.id, collection.defaultModeId, 30)
      expect(instance.paddingLeft).toBe(60)
      editor.undoAction()
      editor.undoAction()
      expect([
        instance.componentScale,
        child.componentScale,
        instance.paddingLeft,
        child.width
      ]).toEqual([1, 1, 10, 20])
    } finally {
      editor.dispose()
    }
  })

  test('an invalid factor cancels an earlier preview, and locked roots refuse scaling', () => {
    const { editor, frame, text } = fixture()
    try {
      const before = structuredClone([frame, text])
      const gesture = editor.beginScaleNodes([frame.id], { x: 100, y: 100 })
      gesture.update(2)
      expect(() => gesture.update(Number.NaN)).toThrow()
      expect([frame, text]).toEqual(before)
      editor.graph.updateNode(frame.id, { locked: true })
      expect(() => editor.beginScaleNodes([frame.id], { x: 0, y: 0 })).toThrow()
      expect(editor.undo.canUndo).toBe(false)
    } finally {
      editor.dispose()
    }
  })

  test('scales nested content from its original values and commits one Undo', () => {
    const { editor, frame, text } = fixture()
    try {
      const gesture = editor.beginScaleNodes([frame.id, text.id], { x: 100, y: 100 })
      gesture.update(1.5)
      gesture.update(2)
      expect([
        frame.width,
        frame.height,
        text.x,
        text.y,
        text.fontSize,
        text.strokes[0].weight,
        text.cornerRadius
      ]).toEqual([400, 200, 40, 20, 32, 4, 8])
      expect(editor.undo.canUndo).toBe(false)
      gesture.commit()
      editor.undoAction()
      expect([
        frame.width,
        frame.height,
        text.x,
        text.y,
        text.fontSize,
        text.strokes[0].weight
      ]).toEqual([200, 100, 20, 10, 16, 2])
      expect(editor.undo.canUndo).toBe(false)
      editor.redoAction()
      expect([frame.width, text.fontSize]).toEqual([400, 32])
    } finally {
      editor.dispose()
    }
  })

  test('cancel and selection changes restore values and source metadata without history', () => {
    const { editor, frame, text } = fixture()
    try {
      const before = structuredClone([frame, text])
      const gesture = editor.beginScaleNodes([frame.id], { x: 100, y: 100 })
      gesture.update(2)
      gesture.cancel()
      expect([frame, text]).toEqual(before)
      const next = editor.beginScaleNodes([frame.id], { x: 100, y: 100 })
      next.update(3)
      editor.select([text.id])
      next.commit()
      expect([frame, text]).toEqual(before)
      expect(editor.undo.canUndo).toBe(false)
      expect(editor.isInteractiveEditing()).toBe(false)
    } finally {
      editor.dispose()
    }
  })

  test('a failed subtree update restores the complete original document', () => {
    const { editor, frame, text } = fixture()
    const before = structuredClone([frame, text])
    const original = editor.graph.updateNode.bind(editor.graph)
    const write = spyOn(editor.graph, 'updateNode').mockImplementation((id, changes) => {
      if (id === text.id && changes.fontSize === 32) throw new Error('Synthetic layout failure')
      return original(id, changes)
    })
    try {
      const gesture = editor.beginScaleNodes([frame.id], { x: 100, y: 100 })
      expect(() => gesture.update(2)).toThrow('Synthetic layout failure')
      expect([frame, text]).toEqual(before)
      expect(editor.undo.canUndo).toBe(false)
      expect(editor.isInteractiveEditing()).toBe(false)
    } finally {
      write.mockRestore()
      editor.dispose()
    }
  })

  test('scales positions around one world anchor under rotated and reflected parents', () => {
    const { editor, frame, text } = fixture()
    try {
      editor.graph.updateNode(frame.id, { rotation: 35, flipX: true })
      editor.graph.updateNode(text.id, { rotation: 25 })
      const other = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        x: 450,
        y: 200,
        width: 40,
        height: 20
      })
      const geometry = createSceneGeometry(editor.graph)
      const beforeText = geometry.toWorld(text, { x: 0, y: 0 })
      const beforeOther = geometry.toWorld(other, { x: 0, y: 0 })
      const anchor = { x: 50, y: 80 }
      const gesture = editor.beginScaleNodes([text.id, other.id], anchor)
      gesture.update(2)
      for (const [node, before] of [
        [text, beforeText],
        [other, beforeOther]
      ] as const) {
        const after = geometry.toWorld(node, { x: 0, y: 0 })
        expect(after.x).toBeCloseTo(anchor.x + 2 * (before.x - anchor.x))
        expect(after.y).toBeCloseTo(anchor.y + 2 * (before.y - anchor.y))
      }
      gesture.cancel()
      expect(geometry.toWorld(text, { x: 0, y: 0 })).toEqual(beforeText)
    } finally {
      editor.dispose()
    }
  })
})
