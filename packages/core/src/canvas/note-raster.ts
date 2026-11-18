import type { Canvas, CanvasKit, Image, Paint, Path, RuntimeEffect } from 'canvaskit-wasm'

import { noteTextCoverage } from './text/note-coverage'

const exportScales = new WeakMap<Canvas, number>()

export function renderWithNoteRaster(canvas: Canvas, scale: number, draw: () => void): void {
  const previous = exportScales.get(canvas)
  exportScales.set(canvas, scale)
  try {
    draw()
  } finally {
    if (previous === undefined) exportScales.delete(canvas)
    else exportScales.set(canvas, previous)
  }
}

export interface NoteRaster {
  ck: CanvasKit
  canvas: Canvas
  scale: number
  x: number
  y: number
  clip: Int32Array
}

export function noteRasterFor(ck: CanvasKit, canvas: Canvas): NoteRaster | null {
  const supersampling = exportScales.get(canvas)
  if (!supersampling) return null
  const [sx, skewX, x, skewY, sy, y, perspectiveX, perspectiveY, perspectiveW] =
    canvas.getTotalMatrix()
  if (
    !Number.isFinite(sx + x + y) ||
    sx <= 0 ||
    sx !== sy ||
    skewX ||
    skewY ||
    perspectiveX ||
    perspectiveY ||
    perspectiveW !== 1
  ) {
    return null
  }
  const clip = Int32Array.from(canvas.getDeviceClipBounds(), (edge, index) =>
    (index < 2 ? Math.floor : Math.ceil)(edge / supersampling)
  )
  return { ck, canvas, scale: sx / supersampling, x: x / supersampling, y: y / supersampling, clip }
}

type Bounds = { left: number; top: number; right: number; bottom: number }
type PixelCoverage = (x: number, y: number) => number

const coverageEffects = new WeakMap<CanvasKit, RuntimeEffect>()
const COVERAGE_SHADER = `
  uniform shader coverageImage;
  uniform float4 ink;
  float4 main(float2 position) {
    float3 digits = coverageImage.eval(position).rgb;
    float coverage = dot(digits, float3(65536, 256, 1)) * (255.0 / 16777215.0);
    return ink * coverage;
  }
`

function coverageImage(ck: CanvasKit, bounds: Bounds, coverage: PixelCoverage): Image | null {
  const { left, top, right, bottom } = bounds
  const width = right - left
  const height = bottom - top
  // Upload coverage as opaque RGB so texture conversion cannot round premultiplied ink.
  const rgba = new Uint8Array(width * height * 4)
  let offset = 0
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const mask = Math.round(0xffffff * coverage(x, y))
      rgba[offset++] = mask >>> 16
      rgba[offset++] = mask >>> 8
      rgba[offset++] = mask
      rgba[offset++] = 255
    }
  }
  return ck.MakeImage(
    {
      width,
      height,
      alphaType: ck.AlphaType.Opaque,
      colorType: ck.ColorType.RGBA_8888,
      colorSpace: ck.ColorSpace.SRGB
    },
    rgba,
    width * 4
  )
}

function paintCoverage(raster: NoteRaster, bounds: Bounds, image: Image, paint: Paint): boolean {
  const { ck, canvas } = raster
  const { left, top, right, bottom } = bounds
  let effect = coverageEffects.get(ck)
  if (!effect) {
    const compiled = ck.RuntimeEffect.Make(COVERAGE_SHADER)
    if (!compiled) return false
    effect = compiled
    coverageEffects.set(ck, effect)
  }
  const { scale, x, y } = raster
  const localLeft = (left - x) / scale
  const localTop = (top - y) / scale
  const matrix = [1 / scale, 0, localLeft, 0, 1 / scale, localTop, 0, 0, 1]
  let mask: ReturnType<typeof image.makeShaderOptions> | undefined
  let shader: ReturnType<typeof effect.makeShaderWithChildren> | undefined
  let layer: Paint | undefined
  try {
    mask = image.makeShaderOptions(
      ck.TileMode.Clamp,
      ck.TileMode.Clamp,
      ck.FilterMode.Nearest,
      ck.MipmapMode.None,
      matrix
    )
    const [red, green, blue, alpha] = paint.getColor()
    shader = effect.makeShaderWithChildren(
      [red * alpha, green * alpha, blue * alpha, alpha],
      [mask]
    )
    layer = new ck.Paint()
    layer.setShader(shader)
    canvas.drawRect(
      ck.LTRBRect(localLeft, localTop, (right - x) / scale, (bottom - y) / scale),
      layer
    )
    return true
  } finally {
    layer?.delete()
    shader?.delete()
    mask?.delete()
  }
}
function drawCoverage(
  raster: NoteRaster,
  bounds: Bounds,
  paint: Paint,
  coverage: PixelCoverage
): boolean {
  const left = Math.max(Math.floor(bounds.left), raster.clip[0])
  const top = Math.max(Math.floor(bounds.top), raster.clip[1])
  const right = Math.min(Math.ceil(bounds.right), raster.clip[2])
  const bottom = Math.min(Math.ceil(bounds.bottom), raster.clip[3])
  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return true
  if (!Number.isSafeInteger(width * height) || width * height > 4_194_304) return false

  const clipped = { left, top, right, bottom }
  const image = coverageImage(raster.ck, clipped, coverage)
  if (!image) return false
  try {
    return paintCoverage(raster, clipped, image, paint)
  } finally {
    image.delete()
  }
}

export function drawNoteBodyCoverage(
  raster: NoteRaster,
  body: { width: number; height: number; cornerRadius: number },
  paint: Paint
): boolean {
  const { x: left, y: top, scale } = raster
  const halfWidth = (body.width * scale) / 2
  const halfHeight = (body.height * scale) / 2
  const radius = Math.max(0, Math.min(body.cornerRadius * scale, halfWidth, halfHeight))
  const centerX = left + halfWidth
  const centerY = top + halfHeight
  return drawCoverage(
    raster,
    { left, top, right: centerX + halfWidth, bottom: centerY + halfHeight },
    paint,
    (x, y) => {
      const dx = Math.abs(x + 0.5 - centerX) - (halfWidth - radius)
      const dy = Math.abs(y + 0.5 - centerY) - (halfHeight - radius)
      const distance = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0)
      return Math.min(1, Math.max(0, 0.5 - distance + radius))
    }
  )
}

export function drawNoteTextCoverage(raster: NoteRaster, path: Path, paint: Paint): boolean {
  if (path.isEmpty()) return true
  const mask = noteTextCoverage(raster.ck, path, raster)
  return !!mask && drawCoverage(raster, mask.bounds, paint, mask.coverage)
}
