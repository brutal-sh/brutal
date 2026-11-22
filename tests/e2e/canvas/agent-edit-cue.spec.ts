import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

test.use({ viewport: { width: 780, height: 530 } })

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`the edited layer cue is clipped and transient with motion set to ${reducedMotion}`, async ({
    page
  }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/?test&no-chrome&no-rulers')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await canvas.clearCanvas()
    const id = await page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      const pageId = store.state.currentPageId
      const layer = store.graph.createNode('ELLIPSE', pageId, {
        x: 160,
        y: 140,
        width: 240,
        height: 130,
        rotation: 19,
        fills: [
          { type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1, a: 1 }, visible: true, opacity: 1 }
        ]
      })
      store.graph.createNode('RECTANGLE', pageId, {
        x: 440,
        y: 140,
        width: 95,
        height: 130,
        fills: [
          { type: 'SOLID', color: { r: 0.65, g: 0.65, b: 0.65, a: 1 }, visible: true, opacity: 1 }
        ]
      })
      store.state.panX = 0
      store.state.panY = 0
      store.state.zoom = 1
      store.clearSelection()
      store.requestRender()
      return layer.id
    })
    await canvas.waitForRender()
    const before = await canvas.screenshotCanvasRegion(590, 390)
    const clockStart = Date.now()
    await page.clock.install({ time: clockStart })
    await page.clock.pauseAt(clockStart + 1000)
    await page.evaluate(async (nodeId) => {
      const automation = window.openPencil?.test?.automation
      if (!automation) throw new Error('Editor automation unavailable')
      await automation('tool', {
        name: 'rename_node',
        args: { id: nodeId, name: 'Edited ellipse' }
      })
    }, id)
    await page.clock.runFor(360)
    const first = await canvas.screenshotCanvasRegion(590, 390)
    expect(first.equals(before)).toBe(false)
    expect(first).toMatchSnapshot(`layer-cue-${reducedMotion}.png`)
    await page.clock.runFor(160)
    const second = await canvas.screenshotCanvasRegion(590, 390)
    expect(second.equals(first)).toBe(reducedMotion === 'reduce')
    await page.clock.runFor(850)
    const settled = await canvas.screenshotCanvasRegion(590, 390)
    expect(settled.equals(before)).toBe(true)
    canvas.assertNoErrors()
  })
}
