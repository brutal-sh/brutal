import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { ALL_TOOLS } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'

import { runEditorTool } from '@/app/ai/tools/runner'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'
import { createDeferred } from '@/app/runtime/deferred'

const stores: EditorStore[] = []

beforeEach(() => {
  Object.assign(globalThis, { window: { innerWidth: 1024, innerHeight: 768 } })
})

afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
  Reflect.deleteProperty(globalThis, 'window')
})

function fixture(graph = new SceneGraph()) {
  const store = createEditorStore(graph)
  stores.push(store)
  const first = store.graph.createNode('RECTANGLE', store.state.currentPageId)
  const previous = store.graph.createNode('RECTANGLE', store.state.currentPageId)
  store.select([previous.id])
  store.markDocumentSaved()
  return { store, first, previous }
}

function callFor(store: EditorStore, ids: string[]) {
  const def = ALL_TOOLS.find((tool) => tool.name === 'select_nodes')
  if (!def) throw new Error('Missing selection tool')
  return { store, figma: makeFigmaFromStore(store), def, args: { ids } }
}

test('explicit selection reaches only its intended editor without graph or history edits', async () => {
  const { store, first } = fixture()
  const other = fixture()
  store.recordEdit({ label: 'Owned retained edit' }, () =>
    store.graph.updateNode(first.id, { x: 31 })
  )
  store.recordEdit({ label: 'Owned redo' }, () => store.graph.updateNode(first.id, { x: 41 }))
  store.undo.undo()
  const graph = JSON.stringify([...store.graph.getAllNodes()])
  const otherGraph = JSON.stringify([...other.store.graph.getAllNodes()])
  const undo = store.undo.peekUndo()
  const redo = store.undo.peekRedo()
  const dirty = store.hasUnsavedChanges()
  expect(await runEditorTool(callFor(store, [first.id]))).toEqual({ selected: [first.id] })
  expect([...store.state.selectedIds]).toEqual([first.id])
  expect([...other.store.state.selectedIds]).toEqual([other.previous.id])
  expect(JSON.stringify([...store.graph.getAllNodes()])).toBe(graph)
  expect(JSON.stringify([...other.store.graph.getAllNodes()])).toBe(otherGraph)
  expect(store.undo.peekUndo()).toBe(undo)
  expect(store.undo.peekRedo()).toBe(redo)
  expect(store.hasUnsavedChanges()).toBe(dirty)
})

test('selection reports the editor action’s actual outermost selection', async () => {
  const { store } = fixture()
  const parent = store.graph.createNode('FRAME', store.state.currentPageId)
  const child = store.graph.createNode('RECTANGLE', parent.id)
  store.markDocumentSaved()
  const before = JSON.stringify([...store.graph.getAllNodes()])
  expect(await runEditorTool(callFor(store, [child.id, parent.id]))).toEqual({
    selected: [parent.id]
  })
  expect([...store.state.selectedIds]).toEqual([parent.id])
  expect(JSON.stringify([...store.graph.getAllNodes()])).toBe(before)
  expect(store.hasUnsavedChanges()).toBe(false)
})

test('a no-longer-live target refuses selection before applying any view effect', async () => {
  const { store, first, previous } = fixture()
  await expect(
    runEditorTool({ ...callFor(store, [first.id]), isLive: () => false })
  ).rejects.toThrow()
  expect([...store.state.selectedIds]).toEqual([previous.id])
  expect(store.hasUnsavedChanges()).toBe(false)
  expect(store.undo.canUndo).toBe(false)
})

test('a page change cannot apply an old target’s selection to the current page', async () => {
  const { store, first } = fixture()
  const call = callFor(store, [first.id])
  const other = store.graph.addPage('Other owned page')
  const prepared = await store.preparePage(other.id)
  if (!prepared) throw new Error('Missing owned prepared page')
  store.commitPageSwitch(prepared)
  const before = JSON.stringify([...store.graph.getAllNodes()])
  const selection = [...store.state.selectedIds]
  await expect(runEditorTool(call)).rejects.toThrow()
  expect(store.state.currentPageId).toBe(other.id)
  expect([...store.state.selectedIds]).toEqual(selection)
  expect(JSON.stringify([...store.graph.getAllNodes()])).toBe(before)
})

test('an aborted selection leaves the editor and API selection unchanged', async () => {
  const { store, first, previous } = fixture()
  const call = callFor(store, [first.id])
  const cancel = new AbortController()
  cancel.abort()
  await expect(runEditorTool({ ...call, signal: cancel.signal })).rejects.toThrow()
  expect([...store.state.selectedIds]).toEqual([previous.id])
  expect(call.figma.currentPage.selection.map((node) => node.id)).toEqual([previous.id])
  expect(store.undo.canUndo).toBe(false)
})

test('equal node and page IDs cannot apply an API from another document', async () => {
  const graphWithIDs = () => {
    let next = 0
    return new SceneGraph(() => `owned-selection-${next++}`)
  }
  const first = fixture(graphWithIDs())
  const other = fixture(graphWithIDs())
  expect(first.first.id).toBe(other.first.id)
  expect(first.store.state.currentPageId).toBe(other.store.state.currentPageId)
  await expect(
    runEditorTool({
      ...callFor(first.store, [first.first.id]),
      figma: makeFigmaFromStore(other.store)
    })
  ).rejects.toThrow()
  expect([...first.store.state.selectedIds]).toEqual([first.previous.id])
  expect([...other.store.state.selectedIds]).toEqual([other.previous.id])
  expect(first.store.hasUnsavedChanges()).toBe(false)
  expect(other.store.hasUnsavedChanges()).toBe(false)
})

test('a selection cancelled while waiting for the edit lock never changes the view', async () => {
  const { store, first, previous } = fixture()
  const create = ALL_TOOLS.find((tool) => tool.name === 'create_shape')
  if (!create) throw new Error('Missing owned lock fixture tool')
  const held = createDeferred<undefined>()
  const pending = runEditorTool({
    store,
    figma: makeFigmaFromStore(store),
    def: { ...create, execute: () => held.promise },
    args: {}
  })
  const cancel = new AbortController()
  const call = callFor(store, [first.id])
  const queued = runEditorTool({ ...call, signal: cancel.signal })
  cancel.abort()
  held.resolve(undefined)
  await pending
  await expect(queued).rejects.toThrow()
  expect([...store.state.selectedIds]).toEqual([previous.id])
  expect(call.figma.currentPage.selection.map((node) => node.id)).toEqual([previous.id])
  expect(store.undo.canUndo).toBe(false)
})
