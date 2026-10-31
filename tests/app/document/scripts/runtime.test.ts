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
  const countedCode = (name: string) =>
    `/** @schema 2.21\n * @input count: number = 3\n */\nreturn []; // ${name}`
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => null,
    adoptChanges: changes.adopt,
    evaluate: async (source, width, _height, inputs) => result(`${source}:${inputs?.count}`, width)
  })
  try {
    const main = editor.createScript(0, 0)
    runtime.attachScriptSource(main, 'grid.js', countedCode('original'))
    editor.setScriptDefinition(main, { uri: 'grid.js', inputs: { count: 3 } })
    editor.select([main])
    editor.createComponentFromSelection()
    const id = editor.createInstanceFromComponent(main)
    if (!id) throw new Error('Missing Script instance.')
    editor.setScriptDefinition(id, { uri: 'grid.js', inputs: { count: 2 } })
    const child = () => editor.graph.getChildren(id)[0]
    await until(() => child()?.name === `${countedCode('original')}:2`)
    runtime.attachScriptSource(main, 'grid.js', countedCode('revised'))
    await until(() => child()?.name === `${countedCode('revised')}:2`)
    editor.detachScriptComponent(main)
    editor.updateNodeWithUndo(id, { width: 260 })
    await until(() => child()?.width === 260)
    expect(child().name).toBe(`${countedCode('revised')}:2`)
    expect(editor.graph.getNode(id)?.type).toBe('FRAME')
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})

test('reparent/reorder invalidates reference output before component sync can expand it', async () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  let target = ''
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => null,
    adoptChanges: changes.adopt,
    evaluate: async () => ({
      ok: true,
      definitions: [],
      input: {},
      nodes: [{ type: 'ref', id: 'ref', ref: target }]
    })
  })
  try {
    const page = editor.state.currentPageId
    target = editor.graph.createNode('COMPONENT', page, { name: 'Referenced component' }).id
    const owner = editor.createScript(0, 0)
    runtime.attachScriptSource(owner, 'reference.js', code('ref'))
    const current = () => {
      const node = editor.graph.getNode(owner)
      return !!node && hasCurrentScriptOutput(editor.graph, node)
    }
    await until(() => current())
    const nestedScript = editor.createScript(0, 0)
    editor.graph.reparentNode(nestedScript, target)
    expect(current()).toBe(false)
    await until(() => !!runtime.scriptRuntimeStates.get(owner)?.error)
    expect(editor.graph.getChildren(editor.graph.getChildren(owner)[0].id)).toHaveLength(0)
    editor.graph.reparentNode(nestedScript, page)
    await until(() => current())
    const previewText = editor.graph.createNode('TEXT', target, { text: 'Before preview' })
    await until(
      () =>
        editor.graph.getChildren(editor.graph.getChildren(owner)[0].id)[0]?.text ===
        'Before preview'
    )
    editor.graph.updateNodePreview(previewText.id, { text: 'Live preview' })
    await until(
      () =>
        editor.graph.getChildren(editor.graph.getChildren(owner)[0].id)[0]?.text === 'Live preview'
    )
    editor.graph.deleteNode(previewText.id)
    await until(() => editor.graph.getChildren(editor.graph.getChildren(owner)[0].id).length === 0)
    const huge = editor.graph.createNode('FRAME', page)
    for (let i = 0; i < 1000; i++) editor.graph.createNode('RECTANGLE', huge.id)
    editor.graph.insertChildAt(huge.id, target, 0)
    expect(current()).toBe(false)
    await until(() => !!runtime.scriptRuntimeStates.get(owner)?.error)
    expect(editor.graph.getChildren(editor.graph.getChildren(owner)[0].id)).toHaveLength(0)
    editor.graph.insertChildAt(huge.id, page, 0)
    await until(() => current())
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})

test('a reference rejected on first render recovers automatically when its source is repaired', async () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  const page = editor.state.currentPageId
  const target = editor.graph.createNode('COMPONENT', page, { name: 'Initially invalid reference' })
  const text = editor.graph.createNode('TEXT', target.id, { text: 'x'.repeat(100_001) })
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => null,
    adoptChanges: changes.adopt,
    evaluate: async () => ({
      ok: true,
      definitions: [],
      input: {},
      nodes: [{ type: 'ref', id: 'ref', ref: target.id }]
    })
  })
  try {
    const owner = editor.createScript(0, 0)
    runtime.attachScriptSource(owner, 'reference.js', code('invalid first'))
    await until(() => !!runtime.scriptRuntimeStates.get(owner)?.error)
    editor.graph.updateNode(text.id, { text: 'Repaired reference' })
    await until(() => {
      const node = editor.graph.getNode(owner)
      return !!node && hasCurrentScriptOutput(editor.graph, node)
    })
    const instance = editor.graph.getChildren(owner)[0]
    expect(editor.graph.getChildren(instance.id)[0].text).toBe('Repaired reference')
    expect(runtime.scriptRuntimeStates.get(owner)?.error).toBeUndefined()
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})

test('Script variable inputs regenerate across inherited themes, values, Undo and deleted-variable repair', async () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.21',
      themes: { mode: ['light', 'dark'] },
      variables: {
        count: { type: 'number', value: 2 },
        ink: {
          type: 'color',
          value: [
            { value: '#2E6FF2', theme: { mode: 'light' } },
            { value: '#F97316', theme: { mode: 'dark' } }
          ]
        }
      },
      children: [
        {
          type: 'frame',
          id: 'theme-parent',
          name: 'Theme parent',
          width: 400,
          height: 300,
          children: [
            {
              type: 'script',
              id: 'theme-script',
              name: 'Themed Script',
              scriptUri: 'grid.js',
              inputs: { count: '$count', ink: '$ink' },
              width: 200,
              height: 200
            }
          ]
        }
      ]
    })
  )
  const editor = createEditor({ graph })
  const changes = createDocumentChanges(editor)
  let calls = 0
  const runtime = createScriptRuntime(editor, io(), {
    getDocumentPath: () => '/project/design.pen',
    adoptChanges: changes.adopt,
    watchSource: async () => () => {
      /* This model fixture has no native file watcher. */
    },
    loadSource: async () => ({
      path: '/project/grid.js',
      source:
        '/** @schema 2.21\n * @input count: number = 2\n * @input ink: color = #2E6FF2\n */\nreturn [];'
    }),
    evaluate: async (_source, _width, _height, values = {}) => {
      calls++
      return {
        ok: true,
        definitions: [],
        input: { ...values },
        nodes: [
          {
            type: 'rectangle',
            id: 'derived',
            name: JSON.stringify(values),
            width: Number(values.count) * 20,
            height: 40,
            fill: String(values.ink)
          }
        ]
      }
    }
  })
  try {
    const child = () => graph.getChildren('theme-script')[0]
    const script = graph.getNode('theme-script')
    if (!script) throw new Error('Missing Script fixture')
    await until(() => child()?.name === JSON.stringify({ count: 2, ink: '#2E6FF2' }))
    const variable = [...graph.variables.values()].find((v) => v.name === 'count')
    if (!variable) throw new Error('Missing count fixture')
    const collection = graph.variableCollections.get(variable.collectionId)
    if (!collection) throw new Error('Missing collection fixture')
    editor.updateNodeWithUndo('theme-parent', {
      variableModes: { [collection.id]: collection.modes[1].modeId }
    })
    await until(() => child()?.name === JSON.stringify({ count: 2, ink: '#F97316' }))
    editor.undo.undo()
    await until(() => child()?.name === JSON.stringify({ count: 2, ink: '#2E6FF2' }))
    editor.updateVariableValue(variable.id, collection.defaultModeId, 3)
    await until(() => child()?.width === 60)
    editor.removeVariable(variable.id)
    await until(() => !!runtime.scriptRuntimeStates.get('theme-script')?.error)
    expect(hasCurrentScriptOutput(graph, script)).toBe(false)
    expect(child()?.width).toBe(60)
    editor.undo.undo()
    await until(
      () =>
        !runtime.scriptRuntimeStates.get('theme-script')?.error &&
        hasCurrentScriptOutput(graph, script)
    )
    expect(child()?.width).toBe(60)
    const before = calls
    editor.updateNodeWithUndo('theme-parent', { x: 20 })
    await new Promise((resolve) => {
      setTimeout(resolve, 140)
    })
    expect(calls).toBe(before)
  } finally {
    runtime.dispose()
    changes.dispose()
    editor.dispose()
  }
})
