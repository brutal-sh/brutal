import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'

import { SkiaRenderer } from '#core/canvas'
import { jpgFormat } from '#core/io/formats'
import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit,
  renderNodesToImage,
  renderThumbnail
} from '#core/io/formats/raster'

test('JPEG composites translucent artwork over white while PNG retains its alpha', async () => {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const node = graph.createNode('RECTANGLE', pageId, {
    width: 20,
    height: 10,
    fills: [colorToFill('#9933CC80')]
  })
  const codec = createCanvasKitRasterCodec(await initCanvasKit())
  for (const format of ['JPG', 'PNG'] as const) {
    const bytes = expectDefined(
      await headlessRenderNodes(graph, pageId, [node.id], { format }),
      'export'
    )
    const image = expectDefined(codec.decode(bytes), 'decoded export')
    const pixel = image.data.slice((5 * image.width + 10) * 4, (5 * image.width + 10) * 4 + 4)
    const expected = format === 'PNG' ? [153, 51, 204, 128] : [204, 153, 230, 255]
    for (const [index, channel] of expected.entries())
      expect(Math.abs(pixel[index] - channel)).toBeLessThanOrEqual(format === 'JPG' ? 2 : 1)
  }
})

function texturedGraph() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', pageId, { width: 128, height: 96, fills: [] })
  for (let index = 0; index < 64; index++) {
    graph.createNode('RECTANGLE', frame.id, {
      x: (index % 8) * 16,
      y: Math.floor(index / 8) * 12,
      width: 16,
      height: 12,
      fills: [colorToFill({ r: (index % 3) / 2, g: (index % 5) / 4, b: (index % 7) / 6, a: 1 })]
    })
  }
  return { graph, frame }
}

test.each(['headless', 'renderer', 'direct-headless', 'direct-renderer'] as const)(
  'shared JPEG IO keeps quality zero at minimum in %s mode',
  async (mode) => {
    const { graph, frame } = texturedGraph()
    const ck = await initCanvasKit()
    const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1), 'surface'))
    const codec = createCanvasKitRasterCodec(ck)
    const sizes: number[] = []
    try {
      for (const quality of [0, 100]) {
        const bytes = await renderJPEG(mode, { graph, frame, ck, renderer }, quality)
        const image = expectDefined(codec.decode(bytes), 'decoded JPEG')
        expect([image.width, image.height]).toEqual([128, 96])
        sizes.push(bytes.length)
      }
      expect(sizes[0]).toBeLessThan(sizes[1])
    } finally {
      renderer.destroy()
    }
  }
)

async function renderJPEG(
  mode: 'headless' | 'renderer' | 'direct-headless' | 'direct-renderer',
  context: ReturnType<typeof texturedGraph> & {
    ck: Awaited<ReturnType<typeof initCanvasKit>>
    renderer: SkiaRenderer
  },
  quality: number
): Promise<Uint8Array> {
  const { graph, frame, ck, renderer } = context
  const pageId = graph.getPages()[0].id
  if (mode === 'direct-headless')
    return expectDefined(
      await headlessRenderNodes(graph, pageId, [frame.id], { format: 'JPG', quality }),
      'direct JPEG'
    )
  if (mode === 'direct-renderer')
    return expectDefined(
      renderNodesToImage(ck, renderer, graph, pageId, [frame.id], {
        scale: 1,
        format: 'JPG',
        quality
      }),
      'direct JPEG'
    )
  const result = expectDefined(
    await jpgFormat.exportContent?.(
      { graph, target: { scope: 'node', nodeId: frame.id } },
      { quality },
      mode === 'renderer' ? { canvasKit: ck, renderer } : undefined
    ),
    'JPEG result'
  )
  if (!(result.data instanceof Uint8Array)) throw new Error('Expected JPEG bytes')
  return result.data
}

test('positional raster APIs retain their callable metadata', () => {
  expect(renderNodesToImage.length).toBe(6)
  expect(renderThumbnail.length).toBe(6)
})
