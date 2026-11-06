import { expect, mock, spyOn, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'
import { effectScope, nextTick, shallowRef } from 'vue'

import * as kit from '@open-pencil/core/canvaskit'

import { useCanvasKitLoader } from '#vue/canvas/surface/kit-loader'

import { asDouble } from '#tests/helpers/doubles'

function fixture(loading: Promise<CanvasKit>, onFailed?: (error: unknown) => void) {
  const loader = spyOn(kit, 'getCanvasKit').mockReturnValue(loading)
  const originalFrame = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
  const frames: FrameRequestCallback[] = []
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => frames.push(callback)
  })
  const createSurface = mock(() => true)
  const ready = mock(() => undefined)
  const scope = effectScope()
  scope.run(() =>
    useCanvasKitLoader({
      canvasRef: shallowRef(asDouble<HTMLCanvasElement>({})),
      lifecycle: { destroyed: false },
      setCanvasKit: () => undefined,
      createSurface,
      loadFonts: () => undefined,
      renderNow: () => undefined,
      onReady: ready,
      onFailed
    })
  )
  return {
    scope,
    frames,
    createSurface,
    ready,
    restore() {
      scope.stop()
      loader.mockRestore()
      if (originalFrame) Object.defineProperty(globalThis, 'requestAnimationFrame', originalFrame)
      else Reflect.deleteProperty(globalThis, 'requestAnimationFrame')
    }
  }
}

for (const handlesFailure of [false, true]) {
  test(`unmount during the pending frame cancels initialization (failure handler: ${handlesFailure})`, async () => {
    const failed = mock(() => undefined)
    const setup = fixture(
      Promise.resolve(asDouble<CanvasKit>({})),
      handlesFailure ? failed : undefined
    )
    try {
      await nextTick()
      expect(setup.frames).toHaveLength(1)
      setup.scope.stop()
      setup.frames[0]?.(0)
      await nextTick()
      expect(setup.createSurface).not.toHaveBeenCalled()
      expect(setup.ready).not.toHaveBeenCalled()
      expect(failed).not.toHaveBeenCalled()
    } finally {
      setup.restore()
    }
  })

  test(`unmount suppresses a late CanvasKit load failure (failure handler: ${handlesFailure})`, async () => {
    const failed = mock(() => undefined)
    const setup = fixture(
      Promise.reject(new Error('Canceled CanvasKit load')),
      handlesFailure ? failed : undefined
    )
    try {
      setup.scope.stop()
      await nextTick()
      expect(setup.frames).toHaveLength(0)
      expect(setup.createSurface).not.toHaveBeenCalled()
      expect(setup.ready).not.toHaveBeenCalled()
      expect(failed).not.toHaveBeenCalled()
    } finally {
      setup.restore()
    }
  })
}
