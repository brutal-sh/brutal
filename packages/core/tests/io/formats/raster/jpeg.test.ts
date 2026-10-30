import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'

import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit
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
