import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { exportFigFile } from '@open-pencil/core/io/formats/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

import { importCanvasFile } from '@/app/shell/menu/actions/import'

const point = { x: 200, y: 100 }
const svg = () =>
  new File(
    ['<svg width="40" height="20"><rect width="40" height="20" fill="red"/></svg>'],
    'mark.svg',
    { type: 'image/svg+xml' }
  )

test('menu import inserts SVG into the current design and supports undo/redo', async () => {
  const editor = createEditor()
  const page = editor.state.currentPageId
  await importCanvasFile(editor, svg(), point, () => true)
  expect(editor.state.currentPageId).toBe(page)
  expect(editor.graph.getChildren(page)).toHaveLength(1)
  expect(editor.graph.getChildren(page)[0].name).toBe('mark')
  editor.undoAction()
  expect(editor.graph.getChildren(page)).toHaveLength(0)
  editor.redoAction()
  expect(editor.graph.getChildren(page)).toHaveLength(1)
})

test('menu import rejects a changed destination, read-only design and unsupported file', async () => {
  const editor = createEditor()
  await expect(importCanvasFile(editor, svg(), point, () => false)).rejects.toThrow(
    'destination changed'
  )
  editor.state.readOnly = true
  await expect(importCanvasFile(editor, svg(), point, () => true)).rejects.toThrow(
    'editable design'
  )
  editor.state.readOnly = false
  await expect(
    importCanvasFile(editor, new File(['text'], 'notes.txt'), point, () => true)
  ).rejects.toThrow('supported image')
  expect(editor.undo.canUndo).toBe(false)
})

test('menu import reads a real Figma archive, inserts its layers, and undoes without replacing the design', async () => {
  const source = new SceneGraph()
  source.createNode('RECTANGLE', source.getPages()[0].id, {
    name: 'Imported shape',
    width: 40,
    height: 20
  })
  const file = new File([new Uint8Array(await exportFigFile(source))], 'source.fig')
  const editor = createEditor()
  const page = editor.state.currentPageId
  editor.graph.createNode('RECTANGLE', page, { name: 'Keep this shape' })
  await importCanvasFile(editor, file, point, () => true)
  expect(editor.graph.getChildren(page).map((node) => node.name)).toEqual([
    'Keep this shape',
    'Imported shape'
  ])
  editor.undoAction()
  expect(editor.graph.getChildren(page).map((node) => node.name)).toEqual(['Keep this shape'])
  editor.redoAction()
  expect(editor.graph.getChildren(page)).toHaveLength(2)
})

test('multi-page Figma imports are refused before any destination mutation', async () => {
  const source = new SceneGraph()
  source.createNode('CANVAS', source.rootId, { name: 'Another page' })
  const file = new File([new Uint8Array(await exportFigFile(source))], 'multi.fig')
  const editor = createEditor()
  await expect(importCanvasFile(editor, file, point, () => true)).rejects.toThrow(
    'preserve all pages'
  )
  expect(editor.undo.canUndo).toBe(false)
  expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
})

test('empty SVG content reports an import failure instead of claiming success', async () => {
  const editor = createEditor()
  const file = new File(['not SVG'], 'broken.svg', { type: 'image/svg+xml' })
  await expect(importCanvasFile(editor, file, point, () => true)).rejects.toThrow()
  expect(editor.undo.canUndo).toBe(false)
})

test.each(['page', 'graph', 'read-only', 'active document'] as const)(
  'delayed SVG import refuses a changed %s before mutating either design',
  async (change) => {
    const editor = createEditor()
    const originalGraph = editor.graph
    const originalPage = editor.state.currentPageId
    const otherPage = originalGraph.createNode('CANVAS', originalGraph.rootId)
    const file = svg()
    const markup = await file.text()
    const delayed = Promise.withResolvers<string>()
    file.text = () => delayed.promise
    let current = true
    const pending = importCanvasFile(editor, file, point, () => current)
    if (change === 'page') await editor.switchPage(otherPage.id)
    if (change === 'graph') editor.replaceGraph(new SceneGraph())
    if (change === 'read-only') editor.setReadOnly(true)
    if (change === 'active document') current = false
    delayed.resolve(markup)
    await expect(pending).rejects.toThrow('destination changed')
    expect(originalGraph.getChildren(originalPage)).toHaveLength(0)
    expect(originalGraph.getChildren(otherPage.id)).toHaveLength(0)
    expect(editor.graph.getChildren(editor.state.currentPageId)).toHaveLength(0)
    expect(editor.undo.canUndo).toBe(false)
    expect(editor.state.selectedIds.size).toBe(0)
  }
)
