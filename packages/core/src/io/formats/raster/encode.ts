import type { CanvasKit, Canvas, Surface, Image, EncodedImageFormat } from 'canvaskit-wasm'

import type { SkiaRenderer } from '#core/canvas'

import type { ExportFormat } from './render'

export interface RasterEncodingOptions {
  width: number
  height: number
  format: ExportFormat
  quality: number
  trimTransparent?: boolean
}

function ckImageFormat(ck: CanvasKit, format: ExportFormat) {
  switch (format) {
    case 'JPG':
      return ck.ImageFormat.JPEG
    case 'WEBP':
      return ck.ImageFormat.WEBP
    default:
      return ck.ImageFormat.PNG
  }
}

function findAlphaBounds(ck: CanvasKit, canvas: Canvas, width: number, height: number) {
  const pixels = canvas.readPixels(0, 0, {
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB,
    width,
    height
  })
  if (!pixels) return null

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    const row = y * width * 4
    for (let x = 0; x < width; x++) {
      if (pixels[row + x * 4 + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + 1)
      maxY = Math.max(maxY, y + 1)
    }
  }

  if (maxX < minX || maxY < minY) return null
  return { minX, minY, maxX, maxY }
}

const MIN_TRANSPARENT_TRIM_INSET = 2

function shouldTrimAlphaBounds(
  alphaBounds: ReturnType<typeof findAlphaBounds>,
  width: number,
  height: number
): boolean {
  return (
    alphaBounds !== null &&
    Math.max(
      alphaBounds.minX,
      alphaBounds.minY,
      width - alphaBounds.maxX,
      height - alphaBounds.maxY
    ) >= MIN_TRANSPARENT_TRIM_INSET
  )
}

function jpegMatte(ck: CanvasKit, surface: Surface): void {
  const matte = new ck.Paint()
  try {
    matte.setColor(ck.WHITE)
    matte.setBlendMode(ck.BlendMode.DstOver)
    surface.getCanvas().drawPaint(matte)
    surface.flush()
  } finally {
    matte.delete()
  }
}

function fallbackRaster(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  canvas: Canvas,
  options: RasterEncodingOptions & { minX: number; minY: number }
): Uint8Array<ArrayBuffer> | null {
  if (options.format !== 'JPG' && options.format !== 'WEBP') return null
  const rawPixels = canvas.readPixels(options.minX, options.minY, {
    alphaType: ck.AlphaType.Unpremul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB,
    width: options.width,
    height: options.height
  })
  return rawPixels instanceof Uint8Array
    ? renderer.encodeRasterFallback(
        rawPixels,
        options.width,
        options.height,
        options.format,
        options.quality
      )
    : null
}

function rasterRegion(options: RasterEncodingOptions, bounds: ReturnType<typeof findAlphaBounds>) {
  if (!bounds) return { ...options, minX: 0, minY: 0 }
  return {
    ...options,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    minX: bounds.minX,
    minY: bounds.minY
  }
}

export function encodeExportSurface(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  surface: Surface,
  options: RasterEncodingOptions
): Uint8Array<ArrayBuffer> | null {
  const { width, height, format, quality, trimTransparent } = options
  const canvas = surface.getCanvas()
  const foundAlphaBounds = trimTransparent ? findAlphaBounds(ck, canvas, width, height) : null
  const alphaBounds = shouldTrimAlphaBounds(foundAlphaBounds, width, height)
    ? foundAlphaBounds
    : null
  if (format === 'JPG') jpegMatte(ck, surface)
  const image = alphaBounds
    ? surface.makeImageSnapshot([
        alphaBounds.minX,
        alphaBounds.minY,
        alphaBounds.maxX,
        alphaBounds.maxY
      ])
    : surface.makeImageSnapshot()
  try {
    const encoded = encodeRasterImage(image, ckImageFormat(ck, format), quality)
    if (encoded) return encoded
    return fallbackRaster(ck, renderer, canvas, rasterRegion(options, alphaBounds))
  } finally {
    image.delete()
  }
}

/** Encodes through CanvasKit while preserving its documented minimum quality. */
export function encodeRasterImage(
  image: Image,
  format: EncodedImageFormat,
  quality: number
): Uint8Array<ArrayBuffer> | null {
  // shortcut: CanvasKit 0.41 defaults zero to 100; remove this integer-zero sentinel when upstream fixes it.
  const encoded = image.encodeToBytes(format, quality === 0 ? Number.MIN_VALUE : quality)
  return encoded ? new Uint8Array(encoded) : null
}
