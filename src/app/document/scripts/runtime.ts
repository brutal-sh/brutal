import { isEqual } from 'es-toolkit/predicate'
import { shallowReactive, watch } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'
import {
  markScriptOutputCurrent,
  scriptOfNode,
  type ScriptDefinition
} from '@open-pencil/scene-graph/scripts'

import { watchTauriFile } from '@/app/document/io/watch/targets'
import { loadCanvasScriptSource } from '@/app/document/scripts/source'

import { scriptInputKey } from './runtime/inputs'
import { createScriptRenderer } from './runtime/render'
import type {
  ScriptRun,
  ScriptRuntimeState,
  ScriptRuntimeOptions,
  ScriptSource
} from './runtime/state'
import { sharedScriptUpload } from './runtime/uploads'

/** One runtime per document; stale executions never reach a replacement graph or edited Script. */
export function createScriptRuntime(editor: Editor, io: IORegistry, options: ScriptRuntimeOptions) {
  const load = options.loadSource ?? loadCanvasScriptSource
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
  let sourceVersion = 0
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
    const shared = sharedScriptUpload(editor, uploads, uri)
    if (shared !== undefined) return shared
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
            sourceVersion++
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

  const inputKey = (id: string, definition: ScriptDefinition) =>
    scriptInputKey(editor, id, definition)

  const { render, renderEmpty } = createScriptRenderer(editor, io, {
    states,
    references,
    sourceFor,
    inputKey,
    evaluate: options.evaluate,
    currentRun: (id, run) => !disposed && !run.controller.signal.aborted && runs.get(id) === run,
    adoptChanges: (apply) => options.adoptChanges(apply)
  })

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
      node.componentId,
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
    sourceVersion++
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
    if (
      'pluginData' in changes ||
      'width' in changes ||
      'height' in changes ||
      'type' in changes ||
      'componentId' in changes
    )
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
    sourceVersion++
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
    collectScriptSources: async () => {
      const graph = editor.graph
      const path = options.getDocumentPath()
      const version = sourceVersion
      const scripts = () =>
        [...graph.getAllNodes()].flatMap((node) => {
          const uri = scriptOfNode(node)?.uri
          return uri ? [{ id: node.id, uri, componentId: node.componentId }] : []
        })
      const original = scripts()
      const entries = await Promise.all(
        original.map(async ({ id, uri }) => [id, await sourceFor(uri, id)] as const)
      )
      if (
        disposed ||
        graph !== editor.graph ||
        path !== options.getDocumentPath() ||
        version !== sourceVersion ||
        !isEqual(original, scripts())
      )
        throw new Error('Script sources changed while preparing the snapshot. Try again.')
      return new Map(entries)
    },
    reloadScript: (id: string) => {
      const node = editor.graph.getNode(id)
      const definition = node && scriptOfNode(node)
      if (!definition) return
      sourceVersion++
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
