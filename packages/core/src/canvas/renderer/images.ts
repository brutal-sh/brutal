import type { Image, TextureSource } from 'canvaskit-wasm'
import { toUint8Array } from 'js-base64'

import type { SkiaRenderer } from '#core/canvas/renderer'

/** A texture source with dimensions, including the canvas uploaded in its drawing task. */
export type LiveImageSource =
  | Extract<TextureSource, { width: number; height: number }>
  | HTMLCanvasElement
const textureSource = (source: LiveImageSource) => source as TextureSource

function hasSameImageSize(image: Image | null, source: LiveImageSource): image is Image {
  return image !== null && image.width() === source.width && image.height() === source.height
}

export const rendererImagesMethods = {
  setLiveImage(
    hash: string,
    source: LiveImageSource | null,
    nodeIds: Iterable<string> = []
  ): boolean {
    const live = this.liveImages.get(hash)
    // A texture made on a surface since replaced has no context left to update or free it in.
    const current = live?.surface === this.surface ? live.image : null
    if (source && hasSameImageSize(current, source)) {
      this.surface.updateTextureFromSource(current, textureSource(source))
    } else {
      current?.delete()
      this.liveImages.delete(hash)
      const image = source && this.surface.makeImageFromTextureSource(textureSource(source))
      if (image) this.liveImages.set(hash, { image, surface: this.surface })
    }
    for (const id of nodeIds) this.invalidateNodePicture(id)
    return this.liveImages.has(hash)
  },

  forgetImage(hash: string): void {
    const keys = Array.from(this.imageCache.entries(), ([key]) => key)
    for (const key of keys) {
      if (key === hash || key.startsWith(`${hash}:`)) this.imageCache.delete(key)
    }
    this.invalidateAllPictures()
  }
} satisfies ThisType<SkiaRenderer>

export type RendererRasterArgs = [
  pixels: Uint8Array,
  width: number,
  height: number,
  format: 'JPG' | 'WEBP',
  quality: number
]

export function createRasterFallback(createCanvas: () => HTMLCanvasElement | null) {
  const methods: {
    encodeRasterFallback: (...args: RendererRasterArgs) => Uint8Array<ArrayBuffer> | null
  } = {
    encodeRasterFallback(
      ...[pixels, width, height, format, quality]: RendererRasterArgs
    ): Uint8Array<ArrayBuffer> | null {
      try {
        const canvas = createCanvas()
        if (!canvas) return null
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        const imageData = ctx.createImageData(width, height)
        imageData.data.set(pixels)
        ctx.putImageData(imageData, 0, 0)
        const mime = format === 'JPG' ? 'image/jpeg' : 'image/webp'
        const dataURL = canvas.toDataURL(mime, quality / 100)
        // Browsers silently return a PNG data URL when the requested encoder is
        // unsupported; reject that so we never write PNG bytes under a .jpg/.webp file.
        if (!dataURL.startsWith(`data:${mime}`)) return null
        const base64 = dataURL.split(',')[1]
        if (!base64) return null
        // js-base64 types its bytes as any buffer; a copy has the plain one a `Blob` takes.
        return new Uint8Array(toUint8Array(base64))
      } catch (err) {
        console.warn('Raster encode fallback failed:', err)
        return null
      }
    }
  }
  const result = methods.encodeRasterFallback
  // Preserve the existing positional API's callable metadata.
  Object.defineProperty(result, 'length', { value: 5 })
  return result
}
