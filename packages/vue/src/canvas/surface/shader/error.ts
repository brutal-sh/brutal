import { getCanvasKit } from '@open-pencil/core/canvaskit'
import type { Size } from '@open-pencil/scene-graph/primitives'

const ERROR_PATTERN = `
uniform float2 size;
uniform float2 pixel;
half4 main(float2 p) {
  float lane = mod((p.x - p.y) * 0.70710678118, 5.0);
  float coverage = clamp(0.5 + (0.5 - abs(lane - 2.5)) / (0.70710678118 * (pixel.x + pixel.y)), 0.0, 1.0);
  coverage = coverage * coverage * (3.0 - 2.0 * coverage);
  float edge = min(min(p.x, size.x - p.x), min(p.y, size.y - p.y));
  coverage = max(coverage, clamp(0.5 + (1.0 - edge) / min(pixel.x, pixel.y), 0.0, 1.0));
  return half4(coverage, 0.0, 0.0, coverage);
}
`

/** A failed shader draws the measured red hatch/border over transparency, including exports. */
export async function renderShaderError(size: Size, logicalSize = size): Promise<Uint8Array> {
  const width = Math.max(1, logicalSize.width)
  const height = Math.max(1, logicalSize.height)
  const pixelWidth = Math.max(1, Math.round(size.width))
  const pixelHeight = Math.max(1, Math.round(size.height))
  const ck = await getCanvasKit()
  const surface = ck.MakeSurface(pixelWidth, pixelHeight)
  if (!surface) throw new Error('Could not create a shader diagnostic surface.')
  const paint = new ck.Paint()
  let diagnostic = ''
  const effect = ck.RuntimeEffect.Make(ERROR_PATTERN, (message) => {
    diagnostic = message
  })
  try {
    if (!effect) throw new Error(`Could not compile a shader diagnostic: ${diagnostic}`)
    const canvas = surface.getCanvas()
    canvas.clear(ck.TRANSPARENT)
    canvas.scale(pixelWidth / width, pixelHeight / height)
    const shader = effect.makeShader([width, height, width / pixelWidth, height / pixelHeight])
    try {
      paint.setShader(shader)
      canvas.drawRect(ck.XYWHRect(0, 0, width, height), paint)
    } finally {
      shader.delete()
    }
    surface.flush()
    const image = surface.makeImageSnapshot()
    try {
      const png = image.encodeToBytes(ck.ImageFormat.PNG)
      if (!png) throw new Error('Could not encode a shader diagnostic frame.')
      return png
    } finally {
      image.delete()
    }
  } finally {
    paint.delete()
    effect?.delete()
    surface.dispose()
  }
}
