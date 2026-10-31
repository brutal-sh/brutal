import { isEqual } from 'es-toolkit/predicate'
import { shallowReactive, watch } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'
import { parseScriptHeader, type ScriptInput } from '@open-pencil/core/scripts/header'
import { scriptReferenceDocument } from '@open-pencil/core/scripts/references'
import {
  markScriptOutputCurrent,
  scriptOfNode,
  resolveScriptInputVariables,
  type ScriptDefinition
} from '@open-pencil/scene-graph/scripts'

import { watchTauriFile } from '@/app/document/io/watch/targets'
import type { evaluateCanvasScript } from '@/app/document/scripts/evaluate'
import { loadCanvasScriptSource } from '@/app/document/scripts/source'

interface ScriptRuntimeState {
  loading: boolean
  definitions: ScriptInput[]
  error?: string
}
interface ScriptRun {
  controller: AbortController
  timer?: ReturnType<typeof setTimeout>
  key: string
}
interface ScriptSource {
  source?: string
  promise?: Promise<string>
  stop?: () => void
  version: number
}
interface ScriptRuntimeOptions {
  getDocumentPath: () => string | null
  adoptChanges<T>(apply: () => T): T
  loadSource?: typeof loadCanvasScriptSource
  evaluate?: typeof evaluateCanvasScript
  watchSource?: (path: string, changed: () => void) => Promise<() => void>
}

/** One runtime per document; stale executions never reach a replacement graph or edited Script. */
export function createScriptRuntime(editor: Editor, io: IORegistry, options: ScriptRuntimeOptions) {
  const load = options.loadSource ?? loadCanvasScriptSource
  const evaluate =
    options.evaluate ??
    (async (...args: Parameters<typeof evaluateCanvasScript>) => {
      const { evaluateCanvasScript } = await import('@/app/document/scripts/evaluate')
      return evaluateCanvasScript(...args)
    })
  const watchSource =
    options.watchSource ?? ((path, changed) => watchTauriFile(path, () => 0, changed))
  const states = shallowReactive(new Map<string, ScriptRuntimeState>())
  const runs = new Map<string, ScriptRun>()
  const references = new Map<string, Set<string>>()
  const sources = new Map<string, ScriptSource>()
  const selectedFiles = new Set<string>()
  const uploads = new Map<string, Map<string, string>>()
  const inheritedUploads = new Map<string, Map<string, string>>()
  let disposed = false
  const keyFor = (uri: string) => JSON.stringify([options.getDocumentPath(), uri])

  function cancel(id: string) {
    const run = runs.get(id)
    run?.controller.abort()
    if (run?.timer) clearTimeout(run.timer)
    runs.delete(id)
  }

  async function sourceFor(uri: string, id: string): Promise<string> {
    if (disposed) throw new Error('Script runtime is closed.')
    const own = uploads.get(id)?.get(uri)
    if (own !== undefined) return own
    const inherited = inheritedUploads.get(id)?.get(uri)
    if (inherited !== undefined) return inherited
    const candidates = new Set(
      [...uploads.entries()].flatMap(([owner, files]) => {
        const source = files.get(uri)
        const node = editor.graph.getNode(owner)
        return source !== undefined && node && scriptOfNode(node)?.uri === uri ? [source] : []
      })
    )
    if (candidates.size === 1) return [...candidates][0]
    if (candidates.size > 1)
      throw new Error(
        'Choose the source for this Script; its filename matches different uploaded files.'
      )
    const key = keyFor(uri)
    let entry = sources.get(key)
    if (!entry) {
      entry = { version: 0 }
      sources.set(key, entry)
    }
    const active = entry
    if (active.source !== undefined) return active.source
    if (active.promise) return active.promise
    const version = active.version
    const current = () =>
      !disposed && sources.get(key) === active && active.version === version && keyFor(uri) === key
    active.promise = load(uri, options.getDocumentPath(), selectedFiles.has(uri))
      .then(async (result) => {
        if (!current()) throw new Error('Script source changed while loading.')
        active.source = result.source
        if (result.path && !active.stop) {
          const stop = await watchSource(result.path, () => {
            if (disposed || sources.get(key) !== active || keyFor(uri) !== key) return
            active.version++
            active.source = undefined
            active.promise = undefined
            for (const node of editor.graph.getAllNodes())
              if (scriptOfNode(node)?.uri === uri) schedule(node.id, true)
          })
          if (current()) active.stop = stop
          else stop()
        }
        return result.source
      })
      .finally(() => {
        if (current()) active.promise = undefined
      })
    return active.promise
  }

  function inputKey(id: string, definition: ScriptDefinition) {
    const node = editor.graph.getNode(id)
    if (!node) return ''
    return JSON.stringify(
      Object.entries(definition.inputs).map(([name, value]) => {
        try {
          return [name, resolveScriptInputVariables(editor.graph, node, { [name]: value })[name]]
        } catch (error) {
          return [name, String(error)]
        }
      })
    )
  }

  async function render(id: string, definition: ScriptDefinition, run: ScriptRun) {
    const graph = editor.graph
    const node = graph.getNode(id)
    if (!node) return
    const size = { width: node.width, height: node.height }
    const variables = inputKey(id, definition)
    const current = () =>
      !disposed &&
      !run.controller.signal.aborted &&
      runs.get(id) === run &&
      editor.graph === graph &&
      isEqual(scriptOfNode(graph.getNode(id) ?? node), definition) &&
      graph.getNode(id)?.width === size.width &&
      graph.getNode(id)?.height === size.height &&
      inputKey(id, definition) === variables
    let definitions: ScriptInput[] = []
    try {
      const source = await sourceFor(definition.uri, id)
      if (!current()) return
      definitions = parseScriptHeader(source)
      states.set(id, { loading: true, definitions })
      const result = await evaluate(
        source,
        size.width,
        size.height,
        resolveScriptInputVariables(
          graph,
          node,
          Object.fromEntries(
            Object.entries(definition.inputs).filter(([name]) =>
              definitions.some((input) => input.name === name)
            )
          )
        ),
        run.controller.signal,
        true
      )
      if (!current()) return
      if (!result.ok) throw new Error(result.error)
      const dependencies = new Set<string>()
      references.set(id, dependencies)
      const context = scriptReferenceDocument(graph, id, result.nodes, dependencies)
      const document = await io.readDocument({
        name: 'script-output.pen',
        data: new TextEncoder().encode(JSON.stringify(context.penDocument))
      })
      if (!current()) return
      if (context.dependencyId) document.graph.deleteNode(context.dependencyId)
      options.adoptChanges(() => editor.replaceScriptOutput(id, definition, size, document.graph))
      states.set(id, { loading: false, definitions: result.definitions })
    } catch (error) {
      if (current())
        states.set(id, {
          loading: false,
          definitions,
          error: error instanceof Error ? error.message : String(error)
        })
    }
  }

  async function renderEmpty(id: string, definition: ScriptDefinition, run: ScriptRun) {
    const graph = editor.graph
    const node = graph.getNode(id)
    if (!node) return
    const size = { width: node.width, height: node.height }
    const document = await io.readDocument({
      name: 'script-placeholder.pen',
      data: new TextEncoder().encode(
        JSON.stringify({
          version: '2.21',
          children: [
            {
              type: 'rectangle',
              id: 'background',
              width: size.width,
              height: size.height,
              fill: { type: 'color', color: '#36B25F', opacity: 0.1 },
              stroke: '#36B25F',
              strokeWidth: 1,
              strokeAlignment: 'inner'
            },
            {
              type: 'icon',
              id: 'code',
              library: 'lucide',
              icon: 'code-xml',
              width: 14,
              height: 14,
              x: size.width / 2 - 7,
              y: size.height / 2 - 14,
              fill: '#1F9947'
            },
            {
              type: 'text',
              id: 'message',
              content: 'No script file selected',
              fontFamily: 'Inter',
              fontSize: 9,
              x: 0,
              y: size.height / 2 + 4,
              width: size.width,
              height: 16,
              textAlign: 'center',
              fill: '#1F9947'
            }
          ]
        })
      )
    })
    if (
      !disposed &&
      !run.controller.signal.aborted &&
      editor.graph === graph &&
      runs.get(id) === run
    )
      options.adoptChanges(() => editor.replaceScriptOutput(id, definition, size, document.graph))
  }

  function schedule(id: string, force = false) {
    if (disposed) return
    const node = editor.graph.getNode(id)
    const definition = node && scriptOfNode(node)
    if (!node || !definition) {
      cancel(id)
      states.delete(id)
      return
    }
    if (node.componentId) {
      const inherited =
        uploads.get(node.componentId)?.get(definition.uri) ??
        inheritedUploads.get(node.componentId)?.get(definition.uri)
      if (inherited !== undefined) {
        const files = inheritedUploads.get(id) ?? new Map<string, string>()
        files.set(definition.uri, inherited)
        inheritedUploads.set(id, files)
      }
    }
    const key = JSON.stringify([
      options.getDocumentPath(),
      definition,
      node.width,
      node.height,
      inputKey(id, definition)
    ])
    if (!force && runs.get(id)?.key === key) return
    cancel(id)
    markScriptOutputCurrent(editor.graph, id, false)
    const run: ScriptRun = { controller: new AbortController(), key }
    runs.set(id, run)
    if (!definition.uri) {
      references.delete(id)
      states.set(id, { loading: false, definitions: [] })
      void renderEmpty(id, definition, run).catch((error) => {
        if (!disposed && runs.get(id) === run)
          states.set(id, { loading: false, definitions: [], error: String(error) })
      })
      return
    }
    states.set(id, { loading: true, definitions: states.get(id)?.definitions ?? [] })
    run.timer = setTimeout(() => {
      run.timer = undefined
      void render(id, definition, run)
    }, 100)
  }

  function refresh() {
    for (const node of editor.graph.getAllNodes()) if (scriptOfNode(node)) schedule(node.id)
  }
  function reset() {
    for (const id of runs.keys()) cancel(id)
    for (const source of sources.values()) source.stop?.()
    sources.clear()
    states.clear()
    refresh()
  }
  function refreshReferences(id: string) {
    if (editor.graph.isApplyingImportedState) return
    for (const [owner, dependencies] of references)
      if (
        owner !== id &&
        (dependencies.has(id) || editor.graph.closest(id, (node) => dependencies.has(node.id)))
      )
        schedule(owner, true)
  }
  const stopCreated = editor.onEditorEvent('node:created', (node) => {
    schedule(node.id)
    refreshReferences(node.id)
    if (node.parentId) refreshReferences(node.parentId)
  })
  const stopUpdated = editor.onEditorEvent('node:updated', (id, changes) => {
    refreshReferences(id)
    if ('pluginData' in changes || 'width' in changes || 'height' in changes || 'type' in changes)
      schedule(id)
  })
  const refreshStructure = (id: string, oldParent: string | null, newParent: string) => {
    refreshReferences(id)
    if (oldParent) refreshReferences(oldParent)
    refreshReferences(newParent)
  }
  const stopReparented = editor.onEditorEvent('node:reparented', refreshStructure)
  const stopReordered = editor.onEditorEvent('node:reordered', (id, parent, _index, previous) =>
    refreshStructure(id, previous, parent)
  )
  const stopPreview = editor.onEditorEvent('node:previewUpdated', (id, changes) => {
    refreshReferences(id)
    if ('width' in changes || 'height' in changes || 'pluginData' in changes) schedule(id)
  })
  const stopDeleted = editor.onEditorEvent('node:deleted', (id, parentId) => {
    refreshReferences(id)
    if (parentId) refreshReferences(parentId)
    references.delete(id)
    cancel(id)
    states.delete(id)
  })
  const stopGraph = editor.onEditorEvent('graph:replaced', () => {
    uploads.clear()
    inheritedUploads.clear()
    references.clear()
    selectedFiles.clear()
    reset()
  })
  const stopVariables = editor.onEditorEvent('render:requested', refresh)
  const stopHistory = editor.onEditorEvent('history:changed', refresh)
  const stopPath = watch(options.getDocumentPath, reset)
  refresh()

  function attachScriptSource(id: string, uri: string, source?: string) {
    const node = editor.graph.getNode(id)
    const definition = node && scriptOfNode(node)
    if (
      !definition ||
      (source !== undefined && new TextEncoder().encode(source).byteLength > 256_000)
    )
      throw new Error('Choose a Script and a source no larger than 256 KB.')
    editor.setScriptDefinition(id, { ...definition, uri })
    selectedFiles.add(uri)
    if (source === undefined) uploads.get(id)?.delete(uri)
    else {
      const files = uploads.get(id) ?? new Map<string, string>()
      files.set(uri, source)
      uploads.set(id, files)
    }
    const previous = sources.get(keyFor(uri))
    previous?.stop?.()
    sources.delete(keyFor(uri))
    schedule(id, true)
    for (const node of editor.graph.getAllNodes())
      if (node.componentId === id && scriptOfNode(node)) schedule(node.id, true)
  }

  return {
    scriptRuntimeStates: states,
    attachScriptSource,
    reloadScript: (id: string) => {
      const node = editor.graph.getNode(id)
      const definition = node && scriptOfNode(node)
      if (!definition) return
      const key = keyFor(definition.uri)
      sources.get(key)?.stop?.()
      sources.delete(key)
      for (const target of editor.graph.getAllNodes())
        if (scriptOfNode(target)?.uri === definition.uri) schedule(target.id, true)
    },
    dispose() {
      disposed = true
      stopCreated()
      stopUpdated()
      stopPreview()
      stopReparented()
      stopReordered()
      stopDeleted()
      stopGraph()
      stopPath()
      stopVariables()
      stopHistory()
      for (const id of runs.keys()) cancel(id)
      for (const source of sources.values()) source.stop?.()
      sources.clear()
      states.clear()
      selectedFiles.clear()
      uploads.clear()
      inheritedUploads.clear()
      references.clear()
    }
  }
}
