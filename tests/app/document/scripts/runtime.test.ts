import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { parsePenFile } from '@open-pencil/pen'
import { hasCurrentScriptOutput } from '@open-pencil/scene-graph/scripts'

import { createDocumentChanges } from '@/app/document/io/changes'
import type { evaluateCanvasScript } from '@/app/document/scripts/evaluate'
import { createScriptRuntime } from '@/app/document/scripts/runtime'
import { createDeferred } from '@/app/runtime/deferred'

const code = (name: string) => `/** @schema 2.21 */\nreturn []; // ${name}`
type Result = Awaited<ReturnType<typeof evaluateCanvasScript>>
const result = (source: string, width: number): Result => ({
  ok: true,
  definitions: [],
  input: {},
  nodes: [{ type: 'rectangle', id: 'generated', name: source, width, height: 30 }]
})
const io = () =>
  new IORegistry([
    {
      ...penFormat,
      readDocument: async (input) => ({
        sourceFormat: 'pen',
        graph: parsePenFile(new TextDecoder().decode(input.data))
      })
    }
  ])
async function until(predicate: () => boolean) {
  const end = Date.now() + 1500
  while (!predicate() && Date.now() < end)
    await new Promise((resolve) => {
      setTimeout(resolve, 10)
    })
  expect(predicate()).toBe(true)
}

test('same-name uploads stay owned by their Scripts across resize and source-path Undo', async () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => null,
    adoptChanges: changes.adopt,
    evaluate: async (source, width) => result(source, width)
  })
  try {
    const first = editor.createScript(0, 0)
    const second = editor.createScript(250, 0)
    runtime.attachScriptSource(first, 'grid.js', code('first'))
    runtime.attachScriptSource(second, 'grid.js', code('second'))
    const child = (id: string) => editor.graph.getChildren(id)[0]
    await until(
      () => child(first)?.name === code('first') && child(second)?.name === code('second')
    )
    editor.updateNodeWithUndo(first, { width: 240 })
    await until(() => child(first)?.width === 240)
    expect(child(first).name).toBe(code('first'))
    runtime.attachScriptSource(first, 'other.js', code('third'))
    await until(() => child(first)?.name === code('third'))
    editor.undo.undo()
    await until(() => child(first)?.name === code('first'))
    changes.markSaved()
    editor.updateNodeWithUndo(first, { width: 260 })
    editor.undo.undo()
    await until(() => child(first)?.width === 240)
    expect(changes.hasUnsavedChanges()).toBe(false)
    expect(child(second).name).toBe(code('second'))
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})

test('a watched source supersedes delayed output, failures refuse stale conversion, and disposal stops work', async () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  const delayed = createDeferred<Result>()
  let source = code('delayed')
  let changed: (() => void) | undefined
  let calls = 0
  let stopped = 0
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => '/project/design.pen',
    adoptChanges: changes.adopt,
    loadSource: async () => {
      if (source === 'unreadable') throw new Error('Unreadable source')
      return { source, path: '/project/grid.js' }
    },
    watchSource: async (_path, callback) => {
      changed = callback
      return () => {
        stopped++
      }
    },
    evaluate: async (text, width) => {
      calls++
      return text === code('delayed') ? delayed.promise : result(text, width)
    }
  })
  try {
    const id = editor.createScript(0, 0)
    editor.setScriptDefinition(id, { uri: 'grid.js', inputs: {} })
    await until(() => calls === 1 && changed !== undefined)
    source = code('new')
    changed?.()
    await until(() => editor.graph.getChildren(id)[0]?.name === code('new'))
    delayed.resolve(result(code('obsolete'), 200))
    await new Promise((resolve) => {
      setImmediate(resolve)
    })
    expect(editor.graph.getChildren(id)[0].name).toBe(code('new'))
    changes.markSaved()
    source = 'unreadable'
    changed?.()
    await until(() => !!runtime.scriptRuntimeStates.get(id)?.error)
    const node = editor.graph.getNode(id)
    expect(node && hasCurrentScriptOutput(editor.graph, node)).toBe(false)
    expect(() => editor.convertScriptToLayers(id)).toThrow()
    expect(changes.hasUnsavedChanges()).toBe(false)
    source = code('repaired')
    changed?.()
    await until(() => editor.graph.getChildren(id)[0]?.name === code('repaired'))
    expect(changes.hasUnsavedChanges()).toBe(false)
    source = code('manual reload')
    runtime.reloadScript(id)
    await until(() => editor.graph.getChildren(id)[0]?.name === code('manual reload'))
    expect(changes.hasUnsavedChanges()).toBe(false)
    const before = calls
    runtime.dispose()
    changed?.()
    await new Promise((resolve) => {
      setTimeout(resolve, 150)
    })
    expect(calls).toBe(before)
    expect(stopped).toBe(2)
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})

test('uploaded reusable Scripts regenerate independent instances and survive source detachment', async () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => null,
    adoptChanges: changes.adopt,
    evaluate: async (source, width, _height, inputs) => result(`${source}:${inputs?.count}`, width)
  })
  try {
    const main = editor.createScript(0, 0)
    runtime.attachScriptSource(main, 'grid.js', code('original'))
    editor.setScriptDefinition(main, { uri: 'grid.js', inputs: { count: 3 } })
    editor.select([main])
    editor.createComponentFromSelection()
    const id = editor.createInstanceFromComponent(main)
    if (!id) throw new Error('Missing Script instance.')
    editor.setScriptDefinition(id, { uri: 'grid.js', inputs: { count: 2 } })
    const child = () => editor.graph.getChildren(id)[0]
    await until(() => child()?.name === `${code('original')}:2`)
    runtime.attachScriptSource(main, 'grid.js', code('revised'))
    await until(() => child()?.name === `${code('revised')}:2`)
    editor.detachScriptComponent(main)
    editor.updateNodeWithUndo(id, { width: 260 })
    await until(() => child()?.width === 260)
    expect(child().name).toBe(`${code('revised')}:2`)
    expect(editor.graph.getNode(id)?.type).toBe('FRAME')
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})
