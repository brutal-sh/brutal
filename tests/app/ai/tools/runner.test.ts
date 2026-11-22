import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { ALL_TOOLS } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'

import { runEditorTool } from '@/app/ai/tools/runner'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'
import { createDeferred } from '@/app/runtime/deferred'

import { expectDefined } from '#tests/helpers/assert'

let store: EditorStore

beforeEach(() => {
  // The automation FigmaAPI reads the viewport size from the window.
  Object.assign(globalThis, { window: { innerWidth: 1024, innerHeight: 768 } })
  store = createEditorStore(new SceneGraph())
})

afterEach(() => {
  store.dispose()
  Reflect.deleteProperty(globalThis, 'window')
})

test('a call cancelled while it waits for its turn edits nothing', async () => {
  const createShape = expectDefined(
    ALL_TOOLS.find((tool) => tool.name === 'create_shape'),
    'create_shape'
  )
  const pageId = store.state.currentPageId
  const figma = makeFigmaFromStore(store, pageId)
  // A first edit holds the document's lock until the test lets it finish.
  const held = createDeferred<undefined>()
  const first = runEditorTool({
    store,
    figma,
    def: { ...createShape, execute: () => held.promise },
    args: {},
    source: 'WebMCP'
  })
  const cancel = new AbortController()
  const queued = runEditorTool({
    store,
    figma,
    def: createShape,
    args: { type: 'RECTANGLE', x: 0, y: 0, width: 40, height: 20 },
    source: 'WebMCP',
    signal: cancel.signal
  })
  cancel.abort()
  held.resolve(undefined)

  await first
  await expect(queued).rejects.toThrow()
  expect(store.graph.getChildren(pageId)).toEqual([])
  expect(store.undo.peekUndo()).toBeUndefined()
})

test('undoing an asynchronous tool call returns the document to saved', async () => {
  const tool = (name: string) =>
    expectDefined(
      ALL_TOOLS.find((candidate) => candidate.name === name),
      name
    )
  const pageId = store.state.currentPageId
  const figma = makeFigmaFromStore(store, pageId)
  const ids = [0, 20, 40].map(
    (x) => store.graph.createNode('RECTANGLE', pageId, { x, y: x / 2, width: 100, height: 70 }).id
  )
  store.markDocumentSaved()

  await runEditorTool({ store, figma, def: tool('arrange'), args: { ids }, source: 'MCP' })
  await Promise.resolve()
  expect(store.hasUnsavedChanges()).toBe(true)

  store.undo.undo()
  await Promise.resolve()
  expect(store.hasUnsavedChanges()).toBe(false)
})

test('a known layer stays highlighted through a slow edit and only commits a cue on success', async () => {
  const rename = expectDefined(
    ALL_TOOLS.find((tool) => tool.name === 'rename_node'),
    'rename_node'
  )
  const pageId = store.state.currentPageId
  const figma = makeFigmaFromStore(store, pageId)
  const { id } = store.graph.createNode('ELLIPSE', pageId, { name: 'Before' })
  const began = createDeferred<undefined>()
  const finish = createDeferred<undefined>()
  const active = spyOn(store, 'aiMarkActive')
  const clear = spyOn(store, 'aiClearActive')
  const done = spyOn(store, 'aiFlashDone')
  const args = { id, name: 'After' }
  try {
    const pending = runEditorTool({
      store,
      figma,
      args,
      def: {
        ...rename,
        execute: async () => {
          began.resolve(undefined)
          await finish.promise
          return rename.execute(figma, args)
        }
      }
    })
    await began.promise
    expect(active).toHaveBeenCalledWith([id])
    expect(clear).not.toHaveBeenCalled()
    expect(done).not.toHaveBeenCalled()
    finish.resolve(undefined)
    await pending
    expect(clear).toHaveBeenCalledTimes(1)
    expect(done).toHaveBeenCalledWith([id])

    await runEditorTool({
      store,
      figma,
      args,
      def: { ...rename, execute: () => ({ error: 'Edit failed' }) }
    })
    expect(clear).toHaveBeenCalledTimes(2)
    expect(done).toHaveBeenCalledTimes(1)
  } finally {
    finish.resolve(undefined)
    active.mockRestore()
    clear.mockRestore()
    done.mockRestore()
  }
})
