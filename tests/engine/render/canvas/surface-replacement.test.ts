import { describe, expect, mock, test } from 'bun:test'

import type { Surface } from 'canvaskit-wasm'

import { SkiaRenderer } from '#core/canvas/renderer'

import { asDouble, asRenderer } from './helpers'

function surface() {
  return asDouble<Surface>({ flush: mock(), delete: mock() })
}

describe('renderer surface replacement', () => {
  test('clears context-owned tiled resources before replacing the main surface', () => {
    const previous = surface()
    const next = surface()
    const teardown: string[] = []
    previous.flush = mock(() => teardown.push('flush'))
    previous.delete = mock(() => teardown.push('surface'))
    const renderer: Pick<
      SkiaRenderer,
      | 'surface'
      | 'liveImages'
      | 'tiledScene'
      | 'sceneBackingAllocationFailed'
      | 'invalidateScenePicture'
      | 'replaceSurface'
    > = {
      surface: previous,
      liveImages: new Map(),
      tiledScene: asDouble<SkiaRenderer['tiledScene']>({
        destroy: mock(() => teardown.push('tiled'))
      }),
      sceneBackingAllocationFailed: true,
      invalidateScenePicture: mock(),
      replaceSurface: SkiaRenderer.prototype.replaceSurface
    }

    renderer.replaceSurface.call(asRenderer(renderer), next)

    expect(renderer.tiledScene.destroy).toHaveBeenCalledTimes(1)
    expect(previous.delete).toHaveBeenCalledTimes(1)
    expect(teardown).toEqual(['flush', 'tiled', 'surface'])
    expect(next.flush).not.toHaveBeenCalled()
    expect(next.delete).not.toHaveBeenCalled()
    expect(renderer.surface).toBe(next)
    expect(renderer.sceneBackingAllocationFailed).toBe(false)
    expect(renderer.invalidateScenePicture).toHaveBeenCalledTimes(1)
  })
})
