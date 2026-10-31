import { expect, test } from 'bun:test'

import { getCanvasKit } from '@open-pencil/core/canvaskit'
import { createCanvasKitRasterCodec } from '@open-pencil/core/io/formats/raster'

import { renderEmptyShader, renderShaderError } from '#vue/canvas/surface/shader/placeholder'

test('an empty source renders the native eight-pixel checkerboard and one-pixel gray border', async () => {
  const image = createCanvasKitRasterCodec(await getCanvasKit()).decode(
    await renderEmptyShader({ width: 640, height: 480 }, { width: 320, height: 240 })
  )
  if (!image) throw new Error('Placeholder PNG did not decode')
  const at = (x: number, y: number) =>
    Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4))
  expect(at(0, 100)).toEqual([128, 128, 128, 255])
  expect(at(1, 100)).toEqual([128, 128, 128, 255])
  expect(at(4, 4)).toEqual([255, 255, 255, 26])
  expect(at(16, 4)).toEqual([0, 0, 0, 26])
  expect(at(16, 16)).toEqual([255, 255, 255, 26])
})

test('the diagnostic frame preserves native red, transparent interior and measured two-times edge coverage', async () => {
  const image = createCanvasKitRasterCodec(await getCanvasKit()).decode(
    await renderShaderError({ width: 640, height: 480 }, { width: 320, height: 240 })
  )
  if (!image) throw new Error('Diagnostic PNG did not decode')
  const at = (x: number, y: number) =>
    Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4))
  expect([image.width, image.height]).toEqual([640, 480])
  expect(at(0, 200)).toEqual([255, 0, 0, 255])
  expect(at(4, 4)).toEqual([0, 0, 0, 0])
  expect(at(6, 100)).toEqual([255, 0, 0, 19])
  expect(at(7, 100)).toEqual([255, 0, 0, 190])
  expect(at(8, 100)).toEqual([255, 0, 0, 255])
  expect(at(9, 100)).toEqual([255, 0, 0, 214])
  expect(at(10, 100)).toEqual([255, 0, 0, 38])
})

test('zero-size and enormous logical layers keep their diagnostic output bounded', async () => {
  const codec = createCanvasKitRasterCodec(await getCanvasKit())
  const tiny = codec.decode(
    await renderShaderError({ width: 1, height: 1 }, { width: 0, height: 0 })
  )
  expect(tiny && [tiny.width, tiny.height]).toEqual([1, 1])
  const large = codec.decode(
    await renderShaderError({ width: 16, height: 16 }, { width: 1e9, height: 1e9 })
  )
  expect(large && [large.width, large.height, large.data.length]).toEqual([16, 16, 1024])
})
