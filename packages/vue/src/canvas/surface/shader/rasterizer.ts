import type { ShaderRasterizer } from '@open-pencil/core'
import { fragmentShaderOf, shaderFrameEncoding } from '@open-pencil/scene-graph/shaders'

import { createFragmentRenderer } from './fragment'
import { renderEmptyShader, renderShaderError } from './placeholder'

/** Whether this browser supports the inherited WebGPU preset renderer. */
export function canDrawShaders(): boolean {
  if (typeof navigator === 'undefined') return false
  // WebGPU is optional, though the DOM types declare it: shader paints keep their saved frame
  // without it.
  const gpu: unknown = Reflect.get(navigator, 'gpu')
  return gpu !== undefined
}

/**
 * The drawn frame on `canvas`, encoded as its pixels call for. A WebGPU canvas has no pixels to
 * read, so the frame is copied to a 2D canvas first, and encoded from there.
 */
async function encodeFrame(canvas: HTMLCanvasElement, lossless = false): Promise<Blob | null> {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  const context = copy.getContext('2d')
  if (!context) return null
  context.drawImage(canvas, 0, 0)
  const { data } = context.getImageData(0, 0, copy.width, copy.height)
  const { type, quality } = lossless
    ? { type: 'image/png', quality: undefined }
    : shaderFrameEncoding(data)
  return new Promise<Blob | null>((resolve) => {
    copy.toBlob(resolve, type, quality)
  })
}

/**
 * Draws GLSL with WebGL and inherited presets with the lazy-loaded WebGPU renderer.
 * GLSL frames retain lossless alpha; inherited frames use `shaderFrameEncoding`.
 */
export function createShaderRasterizer(): ShaderRasterizer | null {
  if (typeof document === 'undefined') return null
  let destroyed = false
  // Read through a call: `destroy` may run while a frame is drawn.
  const isDestroyed = () => destroyed
  return {
    async render(preset, size, logicalSize) {
      const fragment = fragmentShaderOf(preset)
      if (fragment && (fragment.error || (fragment.url.trim() && !fragment.source.trim()))) {
        const bytes = await renderShaderError(size, logicalSize)
        return isDestroyed() ? null : bytes
      }
      if (fragment && !fragment.source.trim()) {
        const bytes = await renderEmptyShader(size, logicalSize)
        return isDestroyed() ? null : bytes
      }
      if (!fragment && !canDrawShaders()) return null
      if (isDestroyed()) return null
      const canvas = document.createElement('canvas')
      // The renderer sizes its buffer at the device pixel ratio itself.
      const ratio = fragment ? 1 : window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(size.width / ratio))
      canvas.height = Math.max(1, Math.round(size.height / ratio))
      const renderer = fragment
        ? createFragmentRenderer(fragment, logicalSize)
        : (await import('shaders/core')).createRendererFromJSON(structuredClone(preset))
      try {
        await renderer.initialize(canvas)
        // A still frame: the clocks stay at zero. The first frame only prepares the effects'
        // pipelines, so the one kept is the second; reading the canvas waits for the GPU.
        await renderer.renderFrame({ deltaSeconds: 0, waitForGpu: false })
        await renderer.renderFrame({ deltaSeconds: 0, waitForGpu: false })
        // Without a usable GPU the renderer draws nothing and says so only here; keeping that
        // empty canvas would save a blank frame over the paint's own.
        if (renderer.getFailureReason() !== null) return null
        const blob = await encodeFrame(canvas, fragment !== null)
        if (isDestroyed() || !blob) return null
        const bytes = new Uint8Array(await blob.arrayBuffer())
        return isDestroyed() ? null : bytes
      } finally {
        renderer.dispose()
      }
    },
    destroy() {
      destroyed = true
    }
  }
}
