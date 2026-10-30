import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '#core/canvas'
import { figmaBlendModeToSkia } from '#core/canvas/blend'
import { initCanvasKit } from '#core/io/formats/raster/headless'

const ck = await initCanvasKit()

for (const mode of ['LINEAR_BURN', 'LINEAR_DODGE'] as const) {
  test(`${mode} matches Pen 1.2.21 reference within one CPU quantization step`, () => {
    const surface = expectDefined(ck.MakeSurface(2, 2), 'surface')
    const renderer = new SkiaRenderer(ck, surface)
    const canvas = surface.getCanvas()
    const paint = renderer.fillPaint
    try {
      canvas.clear(ck.Color4f(0.6, 0.2, 0.8, 1))
      paint.setColor(ck.Color4f(0.8, 0.6, 0.2, 1))
      paint.setBlendMode(figmaBlendModeToSkia(ck, mode))
      canvas.drawRect(ck.XYWHRect(0, 0, 2, 2), paint)
      surface.flush()
      const image = surface.makeImageSnapshot()
      try {
        const pixels = expectDefined(
          image.readPixels(0, 0, {
            width: 1,
            height: 1,
            colorType: ck.ColorType.RGBA_8888,
            alphaType: ck.AlphaType.Unpremul,
            colorSpace: ck.ColorSpace.SRGB
          }),
          'pixels'
        )
        const expected = mode === 'LINEAR_BURN' ? [122, 31, 41, 255] : [255, 204, 255, 255]
        expect([...pixels]).toEqual(expected)
      } finally {
        image.delete()
      }
      canvas.clear(ck.Color4f(0.6, 0.2, 0.8, 128 / 255))
      paint.setColor(ck.Color4f(0.8, 0.6, 0.2, 128 / 255))
      canvas.drawRect(ck.XYWHRect(0, 0, 2, 2), paint)
      surface.flush()
      const translucent = surface.makeImageSnapshot()
      try {
        const pixels = expectDefined(
          translucent.readPixels(0, 0, {
            width: 1,
            height: 1,
            colorType: ck.ColorType.RGBA_8888,
            alphaType: ck.AlphaType.Unpremul,
            colorSpace: ck.ColorSpace.SRGB
          }),
          'translucent pixels'
        )
        const expected = mode === 'LINEAR_BURN' ? [159, 78, 98, 192] : [179, 103, 128, 255]
        // CPU unpremultiplication rounds one channel differently from Pen's GPU PNG export.
        for (const [index, value] of expected.entries())
          expect(Math.abs(pixels[index] - value)).toBeLessThanOrEqual(index === 3 ? 0 : 1)
      } finally {
        translucent.delete()
      }
    } finally {
      renderer.destroy()
    }
  })
}
