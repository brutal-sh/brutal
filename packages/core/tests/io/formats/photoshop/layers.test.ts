import { expect, test } from 'bun:test'

import { writePsd } from 'ag-psd'
import { decode } from 'fast-png'

import { photoshopLayersToScene } from '#core/io/formats/photoshop'
import { decodePhotoshopLayers } from '#core/io/formats/photoshop/decode'

function pixels(width: number, height: number, pixel: number[]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) data.set(pixel, i)
  return { width, height, data }
}

function photoshopDocument(psb: boolean, clipping = false) {
  return writePsd(
    {
      width: 8,
      height: 6,
      imageData: pixels(8, 6, [0, 0, 255, 255]),
      children: [
        { name: 'Background', imageData: pixels(8, 6, [0, 0, 255, 255]) },
        {
          name: 'Artwork',
          hidden: true,
          children: [
            {
              name: 'Accent',
              left: 3,
              top: 2,
              opacity: 0.6,
              clipping,
              imageData: pixels(2, 2, [255, 0, 0, 128])
            },
            { name: 'Edge', left: 5, top: 4, imageData: pixels(1, 1, [0, 255, 0, 255]) }
          ]
        }
      ]
    },
    { psb, noBackground: true }
  )
}

test.each([false, true])(
  'preserves raster layer geometry, groups and pixels (PSB = %s)',
  async (psb) => {
    const result = await decodePhotoshopLayers(photoshopDocument(psb))
    if (!('artwork' in result)) throw new Error(result.reason)
    const graph = photoshopLayersToScene(result.artwork, 'Design')
    const [frame] = graph.getChildren(graph.getPages()[0].id)
    expect(frame).toMatchObject({ name: 'Design', width: 8, height: 6, clipsContent: true })
    const [background, group] = graph.getChildren(frame.id)
    expect(background).toMatchObject({ name: 'Background', type: 'RECTANGLE' })
    expect(group).toMatchObject({ name: 'Artwork', type: 'GROUP', visible: false })
    const [accent, edge] = graph.getChildren(group.id)
    expect(accent).toMatchObject({ name: 'Accent', width: 2, height: 2, opacity: 0.6 })
    expect(edge.name).toBe('Edge')
    expect(graph.getAbsolutePosition(accent.id)).toEqual({ x: 3, y: 2 })
    const fill = accent.fills[0]
    if (fill.type !== 'IMAGE') throw new Error('Expected an image fill')
    const image = graph.images.get(fill.imageHash ?? '')
    if (!image) throw new Error('Expected image data')
    expect(decode(image).data.slice(0, 4)).toEqual(new Uint8Array([255, 0, 0, 128]))
  }
)

test('requests the composite for unsupported features and invalid input', async () => {
  expect(await decodePhotoshopLayers(photoshopDocument(false, true))).toEqual({
    reason: 'The file contains layer masks or clipping.'
  })
  expect(await decodePhotoshopLayers(new ArrayBuffer(0))).toHaveProperty('reason')
})

test('checks individual layer dimensions independently of the canvas', async () => {
  const file = writePsd({
    width: 2,
    height: 2,
    imageData: pixels(2, 2, [0, 0, 0, 255]),
    children: [{ name: 'Too wide', imageData: pixels(4097, 1, [40, 40, 40, 255]) }]
  })
  expect(await decodePhotoshopLayers(file)).toEqual({
    reason: 'The layer bitmap size exceeds the import limit.'
  })
})
