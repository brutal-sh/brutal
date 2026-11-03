import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const cases = [
  { name: 'single', boxes: [{ x: 100, y: 100, width: 120.5, height: 80.75 }] },
  { name: 'rounded', boxes: [{ x: 100, y: 100, width: 123.456789, height: 80.75 }] },
  {
    name: 'multiple',
    boxes: [
      { x: 100, y: 100, width: 20, height: 20 },
      { x: 100.001, y: 144.5, width: 20, height: 20 }
    ]
  }
]

for (const { name, boxes } of cases) {
  test(`fractional ${name} selection badge retains the reference precision`, async ({ page }) => {
    await page.goto('/?test&no-chrome&no-rulers')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await page.evaluate((boxes) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      store.setPageColor({ r: 24 / 255, g: 24 / 255, b: 27 / 255, a: 1 })
      const ids = boxes.map(
        (box) =>
          store.graph.createNode('RECTANGLE', store.state.currentPageId, {
            ...box,
            fills: [
              {
                type: 'SOLID',
                color: { r: 0x77 / 255, g: 0x99 / 255, b: 0xbb / 255, a: 1 },
                visible: true,
                opacity: 1
              }
            ]
          }).id
      )
      store.select(ids)
      store.setZoomAroundPoint(1, 0, 0)
      store.pan(-store.state.panX, -store.state.panY)
      store.requestRender()
    }, boxes)
    await canvas.waitForRender()
    expect(await canvas.screenshotCanvasRegion(420, 280)).toMatchSnapshot(
      `fractional-${name}.png`,
      { maxDiffPixelRatio: 0, threshold: 0 }
    )
    canvas.assertNoErrors()
  })
}
