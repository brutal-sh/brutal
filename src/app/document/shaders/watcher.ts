import { shallowReactive, watch } from 'vue'

import type { Editor } from '@open-pencil/core'
import {
  fragmentShaderOf,
  fragmentShaderPreset,
  readShaderPaints,
  shaderPresetKey,
  withShaderPaints,
  type FragmentShader
} from '@open-pencil/scene-graph/shaders'

import { watchTauriFile } from '@/app/document/io/watch/targets'
import {
  fragmentSourceFilePath,
  loadFragmentSource,
  validateFragmentSource
} from '@/app/document/shaders/source'

interface SourceWatch {
  controller: AbortController
  stop?: () => void
  source?: string
  request?: AbortController
}

interface SourceWatcherOptions {
  getDocumentPath: () => string | null
  adoptChanges: <T>(apply: () => T) => T
  watchSource: (path: string, changed: () => void) => Promise<() => void>
  resolveSource: (
    url: string,
    documentPath: string | null,
    chosen: boolean
  ) => Promise<string | null>
  loadSource: typeof loadFragmentSource
  validateSource: (shader: FragmentShader) => Promise<void>
}

/** Keep external GLSL changes out of edit history, including when Undo restores an older preset. */
export function createShaderSourceWatcher(
  editor: Editor,
  options: Pick<SourceWatcherOptions, 'getDocumentPath' | 'adoptChanges'> &
    Partial<Omit<SourceWatcherOptions, 'getDocumentPath' | 'adoptChanges'>>
) {
  const ports: SourceWatcherOptions = {
    watchSource: (path, changed) => watchTauriFile(path, () => 0, changed),
    resolveSource: fragmentSourceFilePath,
    loadSource: loadFragmentSource,
    validateSource: validateFragmentSource,
    ...options
  }
  const sources = new Map<string, SourceWatch>()
  const errors = shallowReactive(new Map<string, string>())
  const sourceOrder = shallowReactive(new Set<string>())
  const chosen = new Set<string>()
  let disposed = false
  let scheduled = false
  const keyFor = (url: string) => JSON.stringify([ports.getDocumentPath(), url])
  const isActive = (key: string, url: string, entry: SourceWatch) =>
    !disposed &&
    !entry.controller.signal.aborted &&
    sources.get(key) === entry &&
    keyFor(url) === key

  function apply(url: string, source: string) {
    ports.adoptChanges(() => {
      for (const node of editor.graph.getAllNodes()) {
        const shaders = readShaderPaints(node).flatMap((paint) => {
          const shader = fragmentShaderOf(paint.preset)
          return shader?.url === url && shader.source !== source
            ? [{ ...paint, preset: fragmentShaderPreset({ ...shader, source }) }]
            : []
        })
        if (shaders.length)
          editor.graph.updateNode(node.id, {
            pluginData: withShaderPaints(node, [...node.fills, ...node.strokes], shaders)
          })
      }
    })
  }

  async function reload(key: string, url: string, entry: SourceWatch, cached?: string) {
    if (!isActive(key, url, entry)) return
    if (cached === undefined) entry.request?.abort()
    const request = new AbortController()
    if (cached === undefined) entry.request = request
    const isCurrent = () =>
      isActive(key, url, entry) &&
      !request.signal.aborted &&
      (cached === undefined || entry.source === cached)
    try {
      const shader =
        cached === undefined
          ? await ports.loadSource(url, ports.getDocumentPath(), request.signal)
          : { url, source: cached, uniforms: {} }
      await ports.validateSource(shader)
      const graph = editor.graph
      const candidates = [...graph.getAllNodes()].flatMap((node) =>
        readShaderPaints(node).flatMap((paint) => {
          const fragment = fragmentShaderOf(paint.preset)
          return fragment?.url === url
            ? [
                {
                  nodeId: node.id,
                  image: paint.image,
                  preset: shaderPresetKey(paint.preset),
                  fragment
                }
              ]
            : []
        })
      )
      const validated = new Set<string>()
      for (const { fragment } of candidates) {
        const overrides = JSON.stringify(fragment.uniforms)
        if (validated.has(overrides)) continue
        await ports.validateSource({ ...shader, uniforms: fragment.uniforms })
        validated.add(overrides)
      }
      if (!isCurrent() || graph !== editor.graph) return
      const count = [...graph.getAllNodes()].reduce(
        (total, node) =>
          total +
          readShaderPaints(node).filter((paint) => fragmentShaderOf(paint.preset)?.url === url)
            .length,
        0
      )
      if (
        count !== candidates.length ||
        candidates.some(({ nodeId, image, preset }) => {
          const node = graph.getNode(nodeId)
          const paint = node && readShaderPaints(node).find((item) => item.image === image)
          return !paint || shaderPresetKey(paint.preset) !== preset
        })
      ) {
        void reload(key, url, entry, cached)
        return
      }
      entry.source = shader.source
      if (cached === undefined) errors.delete(url)
      apply(url, shader.source)
    } catch (failure) {
      // Partial writes and compile failures keep the last valid source; the next write retries.
      if (isCurrent()) errors.set(url, failure instanceof Error ? failure.message : String(failure))
    }
  }

  async function start(key: string, url: string, entry: SourceWatch) {
    try {
      const path = await ports.resolveSource(url, ports.getDocumentPath(), chosen.has(url))
      if (!path || entry.controller.signal.aborted || keyFor(url) !== key) return
      const stop = await ports.watchSource(path, () => void reload(key, url, entry))
      if (!isActive(key, url, entry)) stop()
      else {
        entry.stop = stop
        // Close the read-before-watch race and refresh a saved source snapshot on opening.
        void reload(key, url, entry)
      }
    } catch (failure) {
      // An unavailable file stays editable/reloadable through its source picker.
      if (!entry.controller.signal.aborted && sources.get(key) === entry && !disposed)
        errors.set(url, failure instanceof Error ? failure.message : String(failure))
    }
  }

  function sync() {
    if (disposed) return
    const urls = new Set(
      [...editor.graph.getAllNodes()].flatMap((node) =>
        readShaderPaints(node).flatMap((paint) => {
          const shader = fragmentShaderOf(paint.preset)
          return shader?.url ? [shader.url] : []
        })
      )
    )
    const active = new Set([...urls].map(keyFor))
    for (const url of sourceOrder) if (!urls.has(url)) sourceOrder.delete(url)
    for (const url of urls) sourceOrder.add(url)
    for (const url of errors.keys()) if (!urls.has(url)) errors.delete(url)
    for (const [key, entry] of sources) {
      if (active.has(key)) continue
      entry.controller.abort()
      entry.request?.abort()
      entry.stop?.()
      sources.delete(key)
    }
    for (const url of urls) {
      const key = keyFor(url)
      const entry = sources.get(key)
      if (entry) {
        if (
          entry.source !== undefined &&
          [...editor.graph.getAllNodes()].some((node) =>
            readShaderPaints(node).some((paint) => {
              const shader = fragmentShaderOf(paint.preset)
              return shader?.url === url && shader.source !== entry.source
            })
          )
        )
          void reload(key, url, entry, entry.source)
      } else {
        const next = { controller: new AbortController() }
        sources.set(key, next)
        void start(key, url, next)
      }
    }
  }
  function schedule() {
    if (scheduled || disposed) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      sync()
    })
  }
  const subscriptions = [
    editor.onEditorEvent('node:created', schedule),
    editor.onEditorEvent('node:deleted', schedule),
    editor.onEditorEvent('node:updated', (_id, changes) => {
      if ('pluginData' in changes || 'fills' in changes || 'strokes' in changes) schedule()
    }),
    editor.onEditorEvent('graph:replaced', () => {
      stop()
      chosen.clear()
      schedule()
    }),
    watch(ports.getDocumentPath, schedule)
  ]
  function stop() {
    for (const entry of sources.values()) {
      entry.controller.abort()
      entry.request?.abort()
      entry.stop?.()
    }
    sources.clear()
    errors.clear()
    sourceOrder.clear()
  }
  schedule()
  return {
    shaderSourceErrors: errors,
    shaderSourceOrder: sourceOrder,
    watchShaderSource: (shader: FragmentShader) => {
      const { url } = shader
      chosen.add(url)
      errors.delete(url)
      const key = keyFor(url)
      const entry = sources.get(key)
      if (entry && !entry.stop) {
        entry.controller.abort()
        entry.request?.abort()
        sources.delete(key)
      } else if (entry) {
        entry.request?.abort()
        entry.source = shader.source
      }
      schedule()
    },
    dispose() {
      disposed = true
      for (const unsubscribe of subscriptions) unsubscribe()
      stop()
    }
  }
}
