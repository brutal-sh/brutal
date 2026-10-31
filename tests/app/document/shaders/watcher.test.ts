import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { colorToFill } from '@open-pencil/scene-graph/color'
import {
  fragmentShaderOf,
  fragmentShaderPreset,
  shaderOfPaint,
  type FragmentShader
} from '@open-pencil/scene-graph/shaders'

import { createDocumentChanges } from '@/app/document/io/changes'
import { createShaderSourceWatcher } from '@/app/document/shaders/watcher'
import { createDeferred } from '@/app/runtime/deferred'

const settled = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

const original: FragmentShader = { url: 'checks.glsl', source: 'blue', uniforms: { u_size: 24 } }

function setup(
  validateSource = async (shader: FragmentShader) => {
    if (shader.source === 'invalid') throw new Error('compile error')
  }
) {
  const editor = createEditor()
  const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
    fills: [colorToFill({ r: 1, g: 1, b: 1, a: 1 })]
  })
  editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(original))
  const changes = createDocumentChanges(editor)
  changes.markSaved()
  let source = 'blue'
  const watchers = new Map<string, () => void>()
  const stopped: string[] = []
  const watcher = createShaderSourceWatcher(editor, {
    getDocumentPath: () => '/design/board.pen',
    adoptChanges: changes.adopt,
    resolveSource: async (url, _documentPath, chosen) =>
      url.startsWith('/') && !chosen ? null : url,
    watchSource: async (path, changed) => {
      watchers.set(path, changed)
      return () => {
        watchers.delete(path)
        stopped.push(path)
      }
    },
    loadSource: async (url) => ({ url, source, uniforms: {} }),
    validateSource
  })
  const current = () => {
    const now = editor.graph.getNode(node.id)
    const shader = now && shaderOfPaint(now, now.fills[0])
    return shader ? fragmentShaderOf(shader.preset) : null
  }
  return {
    editor,
    node,
    changes,
    watcher,
    watchers,
    stopped,
    current,
    write(next: string) {
      source = next
      for (const changed of watchers.values()) changed()
    },
    dispose() {
      watcher.dispose()
      changes.dispose()
      editor.dispose()
    }
  }
}

test('an external GLSL change preserves uniforms, clean state, redo and the last valid frame', async () => {
  const session = setup()
  const { editor, node, changes, watcher, watchers, current } = session
  try {
    editor.setShaderRasterizer({ render: async () => new Uint8Array([1, 2, 3]) })
    await settled()
    expect(watchers.size).toBe(1)
    await editor.settleShaderFrames()
    expect(changes.hasUnsavedChanges()).toBe(false)
    const saved = editor.undo.peekUndo()
    session.write('green')
    await settled()
    expect(current()?.source).toBe('green')
    await editor.settleShaderFrames()
    expect(current()?.uniforms).toEqual({ u_size: 24 })
    expect(changes.hasUnsavedChanges()).toBe(false)
    expect(editor.undo.peekUndo()).toBe(saved)

    session.write('invalid')
    await settled()
    expect(current()?.source).toBe('green')
    expect(watcher.shaderSourceErrors.get(original.url)).toBe('compile error')
    expect(current()?.error).toBe('compile error')
    watcher.watchShaderSource({ ...original, source: 'green', error: 'compile error' })
    await settled()
    expect(current()?.error).toBe('compile error')
    expect(editor.graph.images.get(node.fills[0].imageHash ?? '')).toEqual(
      new Uint8Array([1, 2, 3])
    )
    editor.setShaderPaint(
      [node.id],
      'fills',
      0,
      fragmentShaderPreset({ ...original, uniforms: { u_size: 16 } })
    )
    await settled()
    expect(current()?.source).toBe('green')
    editor.undoAction()
    await settled()
    expect(current()?.source).toBe('green')
    expect(current()?.uniforms).toEqual({ u_size: 24 })
    expect(changes.hasUnsavedChanges()).toBe(false)
    expect(editor.undo.canRedo).toBe(true)

    const reloaded = { ...original, source: 'purple' }
    editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(reloaded))
    watcher.watchShaderSource(reloaded)
    await Promise.resolve()
    expect(current()?.source).toBe('purple')
    expect(watcher.shaderSourceErrors.size).toBe(0)
  } finally {
    session.dispose()
  }
  expect(watchers.size).toBe(0)
})

test('serialized absolute source paths need an explicit choice, and removed paints stop watching', async () => {
  const session = setup()
  const { editor, node, watcher, watchers, stopped } = session
  try {
    await settled()
    expect(watchers.size).toBe(1)
    const shader = { ...original, url: '/private/checks.glsl' }
    editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(shader))
    await settled()
    expect(stopped).toContain('checks.glsl')
    expect(watchers.size).toBe(0)
    watcher.watchShaderSource(shader)
    await settled()
    expect(watchers.has(shader.url)).toBe(true)
    editor.graph.deleteNode(node.id)
    await settled()
    expect(watchers.size).toBe(0)
  } finally {
    session.dispose()
  }
})

test('explicit same-URI reloads update shared source data without adding document history', async () => {
  const session = setup()
  const { editor, changes, watcher, current } = session
  try {
    await settled()
    const saved = editor.undo.peekUndo()
    watcher.watchShaderSource({ ...original, source: 'green' })
    await settled()
    expect(current()?.source).toBe('green')
    expect(current()?.uniforms).toEqual({ u_size: 24 })
    expect(editor.undo.peekUndo()).toBe(saved)
    expect(changes.hasUnsavedChanges()).toBe(false)
    watcher.watchShaderSource({ ...original, source: 'green', error: 'compile error' })
    await settled()
    expect(current()?.error).toBe('compile error')
    expect(editor.undo.peekUndo()).toBe(saved)
    watcher.watchShaderSource({ ...original, source: 'purple' })
    await settled()
    expect(current()?.source).toBe('purple')
    expect(current()?.error).toBeUndefined()
    expect(editor.undo.peekUndo()).toBe(saved)
    expect(changes.hasUnsavedChanges()).toBe(false)
  } finally {
    session.dispose()
  }
})

test('used-source order retains active references and appends a source when it returns', async () => {
  const session = setup()
  const { editor, node, watcher } = session
  try {
    const other = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      fills: [colorToFill({ r: 1, g: 1, b: 1, a: 1 })]
    })
    const second = { ...original, url: 'time.glsl' }
    editor.setShaderPaint([other.id], 'fills', 0, fragmentShaderPreset(second))
    await settled()
    expect([...watcher.shaderSourceOrder]).toEqual(['checks.glsl', 'time.glsl'])
    editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(second))
    await settled()
    expect([...watcher.shaderSourceOrder]).toEqual(['time.glsl'])
    editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(original))
    await settled()
    expect([...watcher.shaderSourceOrder]).toEqual(['time.glsl', 'checks.glsl'])
    editor.graph.deleteNode(other.id)
    await settled()
    expect([...watcher.shaderSourceOrder]).toEqual(['checks.glsl'])
  } finally {
    session.dispose()
  }
  expect(watcher.shaderSourceOrder.size).toBe(0)
})

test('a changed uniform type validates every paint override before replacing any source', async () => {
  const session = setup(async (shader) => {
    if (shader.source === 'vector' && typeof shader.uniforms.u_size === 'number')
      throw new Error('uniform needs two numbers')
  })
  const { editor, node, current, watcher } = session
  try {
    const other = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      fills: [colorToFill({ r: 1, g: 1, b: 1, a: 1 })]
    })
    const vector = { ...original, uniforms: { u_size: [8, 16] } }
    editor.setShaderPaint([other.id], 'fills', 0, fragmentShaderPreset(vector))
    await settled()
    session.write('vector')
    await settled()
    expect(current()?.source).toBe('blue')
    const otherPaint = shaderOfPaint(other, other.fills[0])
    expect(otherPaint && fragmentShaderOf(otherPaint.preset)?.source).toBe('blue')
    expect(watcher.shaderSourceErrors.get(original.url)).toBe('uniform needs two numbers')
    editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(vector))
    session.write('vector')
    await settled()
    expect(current()?.source).toBe('vector')
    expect(current()?.uniforms).toEqual({ u_size: [8, 16] })
    expect(watcher.shaderSourceErrors.size).toBe(0)
  } finally {
    session.dispose()
  }
})

test('a rejected validation cannot mark corrected uniforms as an error', async () => {
  const gate = createDeferred<undefined>()
  let waiting = false
  const session = setup(async (shader) => {
    if (shader.source === 'vector' && typeof shader.uniforms.u_size === 'number') {
      waiting = true
      await gate.promise
      throw new Error('stale scalar error')
    }
  })
  const { editor, node, current, watcher } = session
  try {
    await settled()
    session.write('vector')
    await settled()
    expect(waiting).toBe(true)
    editor.setShaderPaint(
      [node.id],
      'fills',
      0,
      fragmentShaderPreset({ ...original, uniforms: { u_size: [8, 16] } })
    )
    gate.resolve(undefined)
    await settled()
    expect(current()?.source).toBe('vector')
    expect(current()?.uniforms).toEqual({ u_size: [8, 16] })
    expect(current()?.error).toBeUndefined()
    expect(watcher.shaderSourceErrors.size).toBe(0)
  } finally {
    gate.resolve(undefined)
    session.dispose()
  }
})

test('retained shader metadata is not watched after its last image paint is replaced', async () => {
  const session = setup()
  const { editor, node, watcher, watchers } = session
  try {
    await settled()
    const before = [...node.fills]
    editor.graph.updateNode(node.id, { fills: [colorToFill({ r: 1, g: 0, b: 0, a: 1 })] })
    await settled()
    expect(watcher.shaderSourceOrder.size).toBe(0)
    expect(watchers.size).toBe(0)
    editor.graph.updateNode(node.id, { fills: before })
    await settled()
    expect([...watcher.shaderSourceOrder]).toEqual([original.url])
    expect(watchers.size).toBe(1)
  } finally {
    session.dispose()
  }
})

test('a late native watcher registration is closed after disposal', async () => {
  const editor = createEditor()
  const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
    fills: [colorToFill({ r: 1, g: 1, b: 1, a: 1 })]
  })
  editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(original))
  const registration = createDeferred<() => void>()
  let stopCount = 0
  let registered = false
  const watcher = createShaderSourceWatcher(editor, {
    getDocumentPath: () => '/design/board.pen',
    adoptChanges: (apply) => apply(),
    resolveSource: async () => '/design/checks.glsl',
    watchSource: () => {
      registered = true
      return registration.promise
    }
  })
  await settled()
  expect(registered).toBe(true)
  watcher.dispose()
  registration.resolve(() => stopCount++)
  await settled()
  expect(stopCount).toBe(1)
  editor.dispose()
})

test('a same-source paint created while validation awaits is validated before applying the new source', async () => {
  const gate = createDeferred<undefined>()
  let waiting = false
  const session = setup(async (shader) => {
    if (shader.source !== 'vector') return
    if (typeof shader.uniforms.u_size === 'number') throw new Error('invalid scalar')
    if (Array.isArray(shader.uniforms.u_size)) {
      waiting = true
      await gate.promise
    }
  })
  const { editor, node, current, watcher } = session
  try {
    editor.setShaderPaint(
      [node.id],
      'fills',
      0,
      fragmentShaderPreset({
        ...original,
        uniforms: { u_size: [8, 16] }
      })
    )
    await settled()
    session.write('vector')
    await settled()
    expect(waiting).toBe(true)
    const other = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      fills: [colorToFill({ r: 1, g: 1, b: 1, a: 1 })]
    })
    editor.setShaderPaint([other.id], 'fills', 0, fragmentShaderPreset(original))
    gate.resolve(undefined)
    await settled()
    expect(current()?.source).toBe('blue')
    const paint = shaderOfPaint(other, other.fills[0])
    expect(paint && fragmentShaderOf(paint.preset)?.source).toBe('blue')
    expect(watcher.shaderSourceErrors.get(original.url)).toBe('invalid scalar')
  } finally {
    gate.resolve(undefined)
    session.dispose()
  }
})

test('source reloads and derived frames keep a saved component and its instances clean', async () => {
  const session = setup()
  const { editor, node, changes } = session
  try {
    editor.graph.updateNode(node.id, { type: 'COMPONENT' })
    const instance = editor.graph.createInstance(node.id, editor.state.currentPageId)
    expect(instance).not.toBeNull()
    editor.setShaderRasterizer({ render: async () => new Uint8Array([4, 5, 6]) })
    await settled()
    await editor.settleShaderFrames()
    await settled()
    changes.markSaved()
    session.write('green')
    await settled()
    await editor.settleShaderFrames()
    await settled()
    expect(changes.hasUnsavedChanges()).toBe(false)
    const copied = instance && editor.graph.getNode(instance.id)
    const paint = copied && shaderOfPaint(copied, copied.fills[0])
    expect(paint && fragmentShaderOf(paint.preset)?.source).toBe('green')
    expect(paint && fragmentShaderOf(paint.preset)?.uniforms).toEqual({ u_size: 24 })
  } finally {
    session.dispose()
  }
})

test('changing a document identity suppresses an outstanding read and stale callbacks after disposal', async () => {
  const editor = createEditor()
  const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
    fills: [colorToFill({ r: 1, g: 1, b: 1, a: 1 })]
  })
  editor.setShaderPaint([node.id], 'fills', 0, fragmentShaderPreset(original))
  const read = createDeferred<FragmentShader>()
  let documentPath = '/first/design.pen'
  let changed: () => void = () => undefined
  let reads = 0
  const watcher = createShaderSourceWatcher(editor, {
    getDocumentPath: () => documentPath,
    adoptChanges: (apply) => apply(),
    resolveSource: async () => '/first/checks.glsl',
    watchSource: async (_path, callback) => {
      changed = callback
      return () => undefined
    },
    loadSource: () => {
      reads++
      return read.promise
    },
    validateSource: async () => undefined
  })
  try {
    await settled()
    expect(reads).toBe(1)
    documentPath = '/second/design.pen'
    read.resolve({ ...original, source: 'stale' })
    await settled()
    const now = editor.graph.getNode(node.id)
    const paint = now && shaderOfPaint(now, now.fills[0])
    expect(paint && fragmentShaderOf(paint.preset)?.source).toBe('blue')
    watcher.dispose()
    changed()
    await settled()
    expect(reads).toBe(1)
  } finally {
    watcher.dispose()
    editor.dispose()
  }
})
