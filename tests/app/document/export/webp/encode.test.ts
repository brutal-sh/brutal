import { expect, test } from 'bun:test'

import { createCanvasKitRasterCodec, initCanvasKit } from '@open-pencil/core/io/formats/raster'

import { createWebPEncoder } from '@/app/document/export/webp/encode'

function pngHeader(width: number, height: number): Uint8Array {
  const png = new Uint8Array(24)
  const view = new DataView(png.buffer)
  for (const [offset, value] of [
    [0, 0x89504e47],
    [4, 0x0d0a1a0a],
    [8, 13],
    [12, 0x49484452],
    [16, width],
    [20, height]
  ])
    view.setUint32(offset, value)
  return png
}

test.each([
  [0, 1],
  [1, 0],
  [16384, 1],
  [1, 16384],
  [8193, 8192]
])(
  'oversized or empty WebP dimensions %p by %p refuse before loading a codec',
  async (width, height) => {
    let loads = 0
    const encode = createWebPEncoder(async () => {
      loads++
      return initCanvasKit()
    })
    await expect(encode(pngHeader(width, height))).rejects.toThrow('dimensions')
    expect(loads).toBe(0)
  }
)

test.each([{ size: 0 }, { size: 24 }, { size: 64 * 1024 * 1024 + 1 }])(
  'invalid WebP source size %p refuses before codec loading',
  async ({ size }) => {
    let loads = 0
    const encode = createWebPEncoder(async () => {
      loads++
      return initCanvasKit()
    })
    await expect(encode(new Uint8Array(size))).rejects.toThrow()
    expect(loads).toBe(0)
  }
)

test.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
  'invalid WebP quality %p refuses before codec loading',
  async (quality) => {
    let loads = 0
    const encode = createWebPEncoder(async () => {
      loads++
      return initCanvasKit()
    })
    await expect(encode(pngHeader(2, 1), quality)).rejects.toThrow('quality')
    expect(loads).toBe(0)
  }
)

test('the lazy WebP codec retries a failed load and retains alpha with an offset PNG view', async () => {
  const ck = await initCanvasKit()
  const codec = createCanvasKitRasterCodec(ck)
  const png = codec.encodePNG({
    width: 2,
    height: 1,
    data: new Uint8Array([120, 30, 200, 128, 11, 220, 50, 255])
  })
  if (!png) throw new Error('PNG fixture encoding failed')
  const padded = new Uint8Array(png.length + 13)
  padded.set(png, 13)
  const input = padded.subarray(13)
  let loads = 0
  const encode = createWebPEncoder(async () => {
    if (++loads === 1) throw new Error('Owned codec load failure')
    return ck
  })
  await expect(encode(input, 0)).rejects.toThrow('Owned codec load failure')
  for (const quality of [0, 90, 100]) {
    const bytes = await encode(input, quality)
    expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('RIFF')
    expect(new TextDecoder().decode(bytes.subarray(8, 12))).toBe('WEBP')
    const image = codec.decode(bytes)
    if (!image) throw new Error('WebP decoding failed')
    expect([image.width, image.height]).toEqual([2, 1])
    expect([image.data[3], image.data[7]]).toEqual([128, 255])
    expect([...input]).toEqual([...png])
  }
  expect(loads).toBe(2)
})

test('a malformed PNG payload refuses after successful header validation', async () => {
  const encode = createWebPEncoder(initCanvasKit)
  await expect(encode(pngHeader(2, 1))).rejects.toThrow('decode')
})
