import type { CanvasKit, Canvas, Surface, Image, MallocObj } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas'

import { encodeExportSurface, type RasterEncodingOptions } from './encode'

interface SurfaceRenderRequest extends RasterEncodingOptions {
  graph: SceneGraph
  pageId: string
  setup: (canvas: Canvas) => void
}

function createExportSurface(ck: CanvasKit, renderer: SkiaRenderer, width: number, height: number) {
  // Preserve GPU edge coverage; software rendering retains its existing supersampling.
  let renderScale = renderer.surface.reportBackendTypeIsGPU() ? 1 : 2
  const info = {
    alphaType: ck.AlphaType.Premul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB,
    width: width * renderScale,
    height: height * renderScale
  }
  let surface: Surface | null = null
  try {
    surface = renderer.surface.makeSurface(info)
  } catch (error) {
    console.warn('GPU export target unavailable; using software rasterization.', error)
  }
  let rasterPixels: MallocObj | null = null
  if (!surface) {
    renderScale = 2
    info.width = width * renderScale
    info.height = height * renderScale
    rasterPixels = ck.Malloc(Uint8Array, info.width * info.height * 4)
    surface = ck.MakeRasterDirectSurface(info, rasterPixels, info.width * 4)
  }
  if (!surface) {
    if (rasterPixels) ck.Free(rasterPixels)
    return null
  }
  const allocatedSurface = surface
  return {
    surface,
    renderScale,
    renderWidth: info.width,
    renderHeight: info.height,
    dispose() {
      allocatedSurface.delete()
      if (rasterPixels) ck.Free(rasterPixels)
    }
  }
}

function downsample(
  ck: CanvasKit,
  surface: Surface,
  image: Image,
  dimensions: { width: number; height: number; renderWidth: number; renderHeight: number }
): Surface {
  const { width, height, renderWidth, renderHeight } = dimensions
  const target = surface.makeSurface({
    alphaType: ck.AlphaType.Premul,
    colorType: ck.ColorType.RGBA_8888,
    colorSpace: ck.ColorSpace.SRGB,
    width,
    height
  })
  try {
    const canvas = target.getCanvas()
    canvas.clear(ck.TRANSPARENT)
    canvas.drawImageRectOptions(
      image,
      ck.LTRBRect(0, 0, renderWidth, renderHeight),
      ck.LTRBRect(0, 0, width, height),
      ck.FilterMode.Linear,
      ck.MipmapMode.None,
      null
    )
    target.flush()
    return target
  } catch (error) {
    target.delete()
    throw error
  }
}

export function renderToSurface(
  ck: CanvasKit,
  renderer: SkiaRenderer,
  request: SurfaceRenderRequest
): Uint8Array<ArrayBuffer> | null {
  const { width, height } = request
  const allocation = createExportSurface(ck, renderer, width, height)
  if (!allocation) return null
  const { surface, renderScale, renderWidth, renderHeight } = allocation
  let highResImage: Image | null = null
  let downsampleSurface: Surface | null = null
  try {
    const canvas = surface.getCanvas()
    canvas.scale(renderScale, renderScale)
    request.setup(canvas)
    renderer.renderSceneToCanvas(canvas, request.graph, request.pageId)
    surface.flush()
    highResImage = surface.makeImageSnapshot()
    downsampleSurface = downsample(ck, surface, highResImage, {
      width,
      height,
      renderWidth,
      renderHeight
    })
    return encodeExportSurface(ck, renderer, downsampleSurface, request)
  } finally {
    downsampleSurface?.delete()
    highResImage?.delete()
    allocation.dispose()
  }
}
