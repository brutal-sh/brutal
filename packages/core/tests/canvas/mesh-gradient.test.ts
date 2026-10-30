import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SceneGraph } from '@open-pencil/scene-graph'
import { parseColor } from '@open-pencil/scene-graph/color'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'

import { headlessRenderNodes, initCanvasKit } from '#core/io/formats/raster'
import { renderNodesToSVG } from '#core/io/formats/svg'

// Recorded from actual Pen1.2.21's independent primary-color mesh export.
const samples = [
  { x: 0, y: 0, rgba: [255, 0, 0, 255] },
  { x: 255, y: 0, rgba: [0, 255, 0, 255] },
  { x: 0, y: 255, rgba: [0, 0, 255, 255] },
  { x: 255, y: 255, rgba: [255, 255, 255, 255] },
  { x: 64, y: 64, rgba: [178, 47, 47, 255] },
  { x: 128, y: 128, rgba: [127, 128, 128, 255] },
  { x: 192, y: 128, rgba: [127, 208, 128, 255] },
  { x: 64, y: 192, rgba: [76, 47, 208, 255] }
]

test('supersampled raster export retains measured Pen mesh samples within one channel step', async () => {
  const graph = new SceneGraph()
  const page = graph.addPage('Mesh acceptance')
  const mesh = createMeshGradient(2, 2)
  mesh.colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'].map(parseColor)
  const node = graph.createNode('RECTANGLE', page.id, {
    name: 'Independent primary-color mesh',
    width: 256,
    height: 256,
    fills: [
      {
        type: 'GRADIENT_MESH',
        color: parseColor('#FFFFFF'),
        opacity: 1,
        visible: true,
        meshGradient: mesh
      }
    ]
  })
  expect(() => renderNodesToSVG(graph, page.id, [node.id])).toThrow('SVG mesh gradient export')
  const bytes = expectDefined(await headlessRenderNodes(graph, page.id, [node.id]), 'mesh PNG')
  const ck = await initCanvasKit()
  const image = expectDefined(ck.MakeImageFromEncoded(bytes), 'mesh image')
  try {
    for (const sample of samples) {
      const pixel = expectDefined(
        image.readPixels(sample.x, sample.y, {
          width: 1,
          height: 1,
          colorType: ck.ColorType.RGBA_8888,
          alphaType: ck.AlphaType.Unpremul,
          colorSpace: ck.ColorSpace.SRGB
        }),
        'mesh sample'
      )
      // The existing export pipeline renders at 2x then downsamples; the direct 1x probe matches exactly.
      for (const [index, value] of sample.rgba.entries())
        expect(Math.abs(pixel[index] - value)).toBeLessThanOrEqual(index === 3 ? 0 : 1)
    }
  } finally {
    image.delete()
  }
})
