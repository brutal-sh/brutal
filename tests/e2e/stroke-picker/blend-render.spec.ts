import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { readScenePixels } from '#tests/helpers/canvas/pixels'

const editor = useEditorSetup('/?test&no-chrome&no-rulers')

test('stroke blending paints the backdrop and resets for the following stroke', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    for (const [index, smoothing] of [0, 0.6].entries()) {
      store.graph.createNode('RECTANGLE', store.state.currentPageId, {
        x: 80 + index * 240,
        y: 80,
        width: 180,
        height: 120,
        cornerRadius: 16,
        cornerSmoothing: smoothing,
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
        strokeWeight: 12,
        strokes: [
          {
            type: 'SOLID',
            color: { r: 0, g: 0, b: 1, a: 1 },
            opacity: 1,
            visible: true,
            blendMode: 'MULTIPLY',
            weight: 12,
            align: 'INSIDE'
          },
          {
            type: 'SOLID',
            color: { r: 0, g: 1, b: 0, a: 1 },
            opacity: 1,
            visible: true,
            weight: 4,
            align: 'INSIDE'
          }
        ]
      })
    }
    store.clearSelection()
    store.requestRender()
  })
  await expect
    .poll(() =>
      readScenePixels(editor.page, [
        { x: 82, y: 140 },
        { x: 88, y: 140 },
        { x: 100, y: 140 },
        { x: 322, y: 140 },
        { x: 328, y: 140 },
        { x: 340, y: 140 }
      ])
    )
    .toEqual([
      [0, 255, 0, 255],
      [0, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 0, 255],
      [255, 0, 0, 255]
    ])
  expect(await editor.canvas.screenshotCanvasRegion(600, 300)).toMatchSnapshot(
    'stroke-blending.png'
  )
  editor.canvas.assertNoErrors()
})
