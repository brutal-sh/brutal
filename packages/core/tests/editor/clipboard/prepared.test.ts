import { afterEach, expect, spyOn, test } from 'bun:test'

import { captureClipboardSnapshot } from '#core/editor/clipboard/snapshot'
import { createEditor } from '#core/editor/create'

const editors: ReturnType<typeof createEditor>[] = []
afterEach(() => editors.splice(0).forEach((editor) => editor.dispose()))
function fixture() {
  const editor = createEditor({ getViewportSize: () => ({ width: 800, height: 600 }) })
  editors.push(editor)
  const parent = editor.graph.createNode('FRAME', editor.state.currentPageId, {
    width: 200,
    height: 150
  })
  editor.graph.createNode('TEXT', parent.id, { text: 'Editable', width: 100, height: 20 })
  editor.select([parent.id])
  return { editor, parent, snapshot: captureClipboardSnapshot(editor.graph, [parent]) }
}

test('prepared paste creates editable hierarchy as one reversible history step', () => {
  const { editor, parent, snapshot } = fixture()
  const before = editor.graph.nodes.size
  const created = editor.pastePreparedSnapshot(snapshot, { x: 350, y: 250 }, 'Import browser page')
  expect(created).toHaveLength(1)
  expect(editor.graph.nodes.size).toBe(before + 2)
  expect(editor.graph.getChildren(created[0])[0].text).toBe('Editable')
  editor.undoAction()
  expect(editor.graph.nodes.size).toBe(before)
  expect([...editor.state.selectedIds]).toEqual([parent.id])
  editor.redoAction()
  expect(editor.graph.nodes.size).toBe(before + 2)
  expect(editor.graph.getChildren(created[0])[0].text).toBe('Editable')
})

test('a partial insertion failure restores graph identities, images, selection and redo', () => {
  const { editor, parent, snapshot } = fixture()
  editor.pastePreparedSnapshot(snapshot)
  editor.undoAction()
  const before = editor.graph.nodes.size
  const create = editor.graph.createNode.bind(editor.graph)
  let count = 0
  const failure = spyOn(editor.graph, 'createNode').mockImplementation((...args) => {
    if (++count === 2) throw new Error('Controlled insertion failure')
    return create(...args)
  })
  try {
    expect(() => editor.pastePreparedSnapshot(snapshot)).toThrow('Controlled insertion failure')
    expect(editor.graph.nodes.size).toBe(before)
    expect(editor.graph.getNode(parent.id)).toBe(parent)
    expect([...editor.state.selectedIds]).toEqual([parent.id])
  } finally {
    failure.mockRestore()
  }
  editor.redoAction()
  expect(editor.graph.nodes.size).toBe(before + 2)
})

test('read-only documents refuse prepared paste without changing layers', () => {
  const { editor, snapshot } = fixture()
  const before = editor.graph.nodes.size
  editor.setReadOnly(true)
  expect(() => editor.pastePreparedSnapshot(snapshot)).toThrow('read-only')
  expect(editor.graph.nodes.size).toBe(before)
})
