import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'

import { createCanvasRenderLoop } from '#vue/canvas/surface/render-loop'

function createFrameScheduler() {
  let nextId = 1
  const callbacks = new Map<number, FrameRequestCallback>()
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = nextId++
    callbacks.set(id, callback)
    return id
  }) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => {
    callbacks.delete(id)
  }) as typeof cancelAnimationFrame

  return {
    get pendingCount() {
      return callbacks.size
    },
    flush() {
      const pending = [...callbacks]
      callbacks.clear()
      for (const [id, callback] of pending) callback(id)
    },
    restore() {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame
      globalThis.cancelAnimationFrame = originalCancelAnimationFrame
    }
  }
}

describe('canvas render loop', () => {
  test('waits for editor events before scheduling renders', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      let renders = 0
      createCanvasRenderLoop(editor, () => {
        renders++
      })

      expect(scheduler.pendingCount).toBe(0)
      editor.requestRepaint()
      expect(scheduler.pendingCount).toBe(1)
      scheduler.flush()
      expect(renders).toBe(1)
      expect(scheduler.pendingCount).toBe(0)
    } finally {
      scheduler.restore()
    }
  })

  test('coalesces multiple editor events into one animation frame', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId)
      let renders = 0
      createCanvasRenderLoop(editor, () => {
        renders++
      })

      editor.requestRender()
      editor.requestRepaint()
      editor.select([node.id])
      editor.pan(10, 0)

      expect(scheduler.pendingCount).toBe(1)
      scheduler.flush()
      expect(renders).toBe(1)
    } finally {
      scheduler.restore()
    }
  })

  test('scene layers render on full repaint and ignore selection and overlay-only repaint', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId)
      let renders = 0
      createCanvasRenderLoop(
        editor,
        () => {
          renders++
        },
        { layer: 'scene' }
      )

      editor.select([node.id])
      editor.requestRepaint('overlays')
      expect(scheduler.pendingCount).toBe(0)

      editor.requestRepaint()
      expect(scheduler.pendingCount).toBe(1)
      scheduler.flush()
      expect(renders).toBe(1)
    } finally {
      scheduler.restore()
    }
  })

  test('overlay layers render on repaint and selection events', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId)
      let renders = 0
      createCanvasRenderLoop(
        editor,
        () => {
          renders++
        },
        { layer: 'overlays' }
      )

      editor.requestRepaint()
      editor.select([node.id])
      expect(scheduler.pendingCount).toBe(1)
      scheduler.flush()
      expect(renders).toBe(1)
    } finally {
      scheduler.restore()
    }
  })

  test('coalesces multiple canvas surfaces into one animation frame', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      let sceneRenders = 0
      let overlayRenders = 0
      createCanvasRenderLoop(
        editor,
        () => {
          sceneRenders++
        },
        { layer: 'scene' }
      )
      createCanvasRenderLoop(
        editor,
        () => {
          overlayRenders++
        },
        { layer: 'overlays' }
      )

      editor.pan(10, 0)
      expect(scheduler.pendingCount).toBe(1)
      scheduler.flush()
      expect(sceneRenders).toBe(1)
      expect(overlayRenders).toBe(1)
    } finally {
      scheduler.restore()
    }
  })

  test('repaint events dirty every canvas view even when its local version is unchanged', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      const firstView = { ...editor.state, selectedIds: new Set<string>() }
      const secondView = { ...editor.state, selectedIds: new Set<string>() }
      let firstRenders = 0
      let secondRenders = 0
      const firstLoop = createCanvasRenderLoop(editor, () => firstRenders++, {
        layer: 'scene',
        getRenderState: () => firstView
      })
      const secondLoop = createCanvasRenderLoop(editor, () => secondRenders++, {
        layer: 'scene',
        getRenderState: () => secondView
      })

      editor.requestRepaint()
      scheduler.flush()
      firstLoop.markRendered()
      secondLoop.markRendered()
      expect([firstRenders, secondRenders]).toEqual([1, 1])

      editor.requestRepaint()
      scheduler.flush()
      expect([firstRenders, secondRenders]).toEqual([2, 2])
    } finally {
      scheduler.restore()
    }
  })

  test('reads versions and selection from the supplied canvas view state', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      const viewState = {
        ...editor.state,
        renderVersion: 4,
        sceneVersion: 2,
        selectedIds: new Set(['pane-node'])
      }
      let renders = 0
      const loop = createCanvasRenderLoop(
        editor,
        () => {
          renders++
        },
        { getRenderState: () => viewState }
      )

      editor.requestRepaint()
      scheduler.flush()
      loop.markRendered()
      expect(renders).toBe(1)

      editor.requestRepaint()
      scheduler.flush()
      expect(renders).toBe(2)

      viewState.renderVersion++
      editor.requestRepaint()
      scheduler.flush()
      expect(renders).toBe(3)
    } finally {
      scheduler.restore()
    }
  })

  test('renders after an injected suspension finishes without a version change', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      const viewState = { ...editor.state }
      let suspended = false
      let renders = 0
      const loop = createCanvasRenderLoop(
        editor,
        () => {
          renders++
        },
        {
          getRenderState: () => viewState,
          shouldSuspendRender: () => suspended
        }
      )

      editor.requestRepaint()
      scheduler.flush()
      loop.markRendered()
      suspended = true
      editor.requestRepaint()
      scheduler.flush()
      expect(renders).toBe(1)

      suspended = false
      scheduler.flush()
      expect(renders).toBe(2)
    } finally {
      scheduler.restore()
    }
  })

  test('cancels pending renders when paused', () => {
    const scheduler = createFrameScheduler()
    try {
      const editor = createEditor()
      let renders = 0
      const loop = createCanvasRenderLoop(editor, () => {
        renders++
      })

      editor.requestRender()
      expect(scheduler.pendingCount).toBe(1)
      loop.pause()
      expect(scheduler.pendingCount).toBe(0)

      editor.requestRender()
      scheduler.flush()
      expect(renders).toBe(0)
    } finally {
      scheduler.restore()
    }
  })
})
