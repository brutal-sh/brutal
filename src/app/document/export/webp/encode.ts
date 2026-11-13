import type { CanvasKit } from 'canvaskit-wasm'

import { encodeRasterImage } from '@open-pencil/core/io/formats/raster'

const MAX_PNG_BYTES = 64 * 1024 * 1024
const MAX_RGBA_BYTES = 256 * 1024 * 1024
const WEBP_MAX_DIMENSION = 16383

function hasPNGHeader(view: DataView): boolean {
  return (
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a &&
    view.getUint32(8) === 13 &&
    view.getUint32(12) === 0x49484452
  )
}

function validatePNG(png: Uint8Array): void {
  if (png.length < 24 || png.length > MAX_PNG_BYTES)
    throw new Error('Invalid WebP source image size.')
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  if (!hasPNGHeader(view)) throw new Error('Invalid WebP source PNG.')
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (
    !width ||
    !height ||
    width > WEBP_MAX_DIMENSION ||
    height > WEBP_MAX_DIMENSION ||
    width * height * 4 > MAX_RGBA_BYTES
  )
    throw new Error('Image dimensions exceed the WebP export limit.')
}

export function createWebPEncoder(load: () => Promise<CanvasKit>) {
  let loading: Promise<CanvasKit> | undefined
  return async (png: Uint8Array, quality = 90): Promise<Uint8Array> => {
    validatePNG(png)
    if (!Number.isFinite(quality) || quality < 0 || quality > 100)
      throw new Error('Invalid WebP quality.')
    const pending = (loading ??= load())
    let ck: CanvasKit
    try {
      ck = await pending
    } catch (error) {
      if (loading === pending) loading = undefined
      throw error
    }
    const image = ck.MakeImageFromEncoded(png)
    if (!image) throw new Error('Could not decode the WebP source image.')
    try {
      const bytes = encodeRasterImage(image, ck.ImageFormat.WEBP, quality)
      if (!bytes) throw new Error('Could not encode WebP.')
      return bytes
    } finally {
      image.delete()
    }
  }
}
