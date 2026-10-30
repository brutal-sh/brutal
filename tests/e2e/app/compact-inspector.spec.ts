import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { getSelectedNode } from '#tests/helpers/store'

test('compact frame inspector edits paired dimensions, appearance and clipping with Undo', async ({
  page
}, testInfo) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(150, 150, 350, 270)
  const inspector = page.getByTestId('properties-panel')
  await expect(inspector.getByRole('tablist')).toHaveCount(0)
  await expect(inspector.getByRole('region', { name: 'Status', exact: true })).toHaveCount(0)
  await expect(inspector.getByRole('combobox', { name: 'Frame preset', exact: true })).toHaveCount(
    0
  )
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  const height = inspector.getByRole('spinbutton', { name: 'Height', exact: true })
  await expect(width).toHaveAttribute('aria-valuenow', '200')
  const w = await width.boundingBox()
  const h = await height.boundingBox()
  expect(w && h && Math.abs(w.y - h.y)).toBeLessThan(1)
  await width.dblclick()
  await width.fill('240')
  await width.press('Enter')
  await expect.poll(async () => (await getSelectedNode(page))?.width).toBe(240)
  await canvas.undo()
  await expect(width).toHaveAttribute('aria-valuenow', '200')
  const opacity = inspector
    .getByRole('region', { name: 'Appearance', exact: true })
    .getByRole('spinbutton', { name: 'Opacity', exact: true })
  await opacity.dblclick()
  await opacity.fill('50')
  await opacity.press('Enter')
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.opacity))
    .toBe(0.5)
  await canvas.undo()
  const appearance = inspector.getByRole('region', { name: 'Appearance', exact: true })
  await appearance.getByRole('combobox', { name: 'Blend mode', exact: true }).click()
  await page.getByRole('option', { name: 'Multiply', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.blendMode))
    .toBe('MULTIPLY')
  await canvas.undo()
  const radius = inspector.getByRole('spinbutton', { name: 'Radius', exact: true })
  await radius.dblclick()
  await radius.fill('12')
  await radius.press('Enter')
  await expect.poll(async () => (await getSelectedNode(page))?.cornerRadius).toBe(12)
  await canvas.undo()
  const clipping = inspector
    .getByRole('region', { name: 'Appearance', exact: true })
    .getByRole('checkbox', { name: 'Clip content', exact: true })
  await expect(clipping).toBeChecked()
  await clipping.uncheck()
  await expect.poll(async () => (await getSelectedNode(page))?.clipsContent).toBe(false)
  await canvas.undo()
  await expect(clipping).toBeChecked()
  const zoom = await page.getByRole('button', { name: 'Zoom out', exact: true }).boundingBox()
  const panel = await inspector.boundingBox()
  expect(zoom && panel && zoom.x + zoom.width <= panel.x).toBe(true)
  await inspector.screenshot({ path: testInfo.outputPath('compact-frame-inspector.png') })
  canvas.assertNoErrors()
})

test('Fill and Hug sizing checkboxes update a real auto-layout child and Undo restores sizing', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const parent = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Parent',
      width: 400,
      height: 200,
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    const child = store.graph.createNode('FRAME', parent.id, {
      name: 'Child',
      width: 100,
      height: 80,
      layoutMode: 'VERTICAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED'
    })
    store.select([child.id])
    store.requestRender()
  })
  const fill = page.getByRole('checkbox', { name: 'Fill Width', exact: true })
  await fill.check()
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.layoutGrow))
    .toBe(1)
  await canvas.undo()
  await expect(fill).not.toBeChecked()
  const hug = page.getByRole('checkbox', { name: 'Hug Height', exact: true })
  await hug.check()
  await expect
    .poll(() =>
      page.evaluate(() => window.openPencil?.getStore?.().selectedNode.value?.primaryAxisSizing)
    )
    .toBe('HUG')
  await canvas.undo()
  await expect(hug).not.toBeChecked()
  canvas.assertNoErrors()
})
