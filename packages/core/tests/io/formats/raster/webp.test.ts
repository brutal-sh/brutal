import { afterEach, beforeEach, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'

import { SkiaRenderer } from '#core/canvas'
import { getCanvasKit } from '#core/canvaskit'
import { webpFormat } from '#core/io/formats'
import { createCanvasKitRasterCodec } from '#core/io/formats/raster'

const ck = await getCanvasKit()
let renderer: SkiaRenderer
beforeEach(() => {
  renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1), 'surface'))
})
afterEach(() => renderer.destroy())

test.each([undefined, 37])(
  'an unavailable WebP encoder hands the host a scaled PNG and quality %p',
  async (requestedQuality) => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const node = graph.createNode('RECTANGLE', pageId, {
      width: 20,
      height: 10,
      fills: [colorToFill('#33669980')]
    })
    const codec = createCanvasKitRasterCodec(ck)
    let dimensions: number[] | undefined
    let receivedQuality: number | undefined
    const encoded = new Uint8Array([1, 2, 3])
    const result = await webpFormat.exportContent?.(
      { graph, target: { scope: 'node', nodeId: node.id } },
      { scale: 3, quality: requestedQuality },
      {
        canvasKit: ck,
        renderer,
        encodeWebP: async (png, quality) => {
          receivedQuality = quality
          const image = codec.decode(png)
          dimensions = image ? [image.width, image.height, image.data[3]] : undefined
          return encoded
        }
      }
    )
    expect(dimensions).toEqual([60, 30, 128])
    expect(receivedQuality).toBe(requestedQuality)
    expect(result?.data).toEqual(encoded)
    expect(result?.mimeType).toBe('image/webp')
  }
)

test('a failed host WebP conversion rejects rather than claiming a successful export', async () => {
  const graph = new SceneGraph()
  const node = graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    width: 20,
    height: 10,
    fills: [colorToFill('#336699')]
  })
  await expect(
    webpFormat.exportContent?.(
      { graph, target: { scope: 'node', nodeId: node.id } },
      {},
      {
        canvasKit: ck,
        renderer,
        encodeWebP: async () => {
          throw new Error('Encoder failed')
        }
      }
    )
  ).rejects.toThrow('Encoder failed')
})
