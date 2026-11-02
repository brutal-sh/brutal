import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'
import { getSelectedNode } from '#tests/helpers/store'

test('top-level Fill sizing retains geometry, supports Undo and numeric override, and saves and reopens', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(150, 150, 270, 230)
  const inspector = page.getByTestId('properties-panel')
  const fill = inspector.getByRole('checkbox', { name: 'Fill Width', exact: true })
  await fill.check()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await canvas.undo()
  await expect(fill).not.toBeChecked()
  await fill.check()
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  await width.dblclick()
  await width.fill('140')
  await width.press('Enter')
  await expect(fill).not.toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(140)
  await canvas.undo()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  page.once('dialog', (dialog) => dialog.accept('deferred-fill.pen'))
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await download
  const bytes = await readFile(await saved.path())
  expect(parsePenDocument(bytes.toString()).children[0]).toMatchObject({
    width: 'fill_container(120)',
    height: 80
  })
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({ name: 'deferred-fill.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Frame 1' }).click()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await inspector.getByRole('button', { name: 'Vertical layout', exact: true }).click()
  await inspector.getByRole('checkbox', { name: 'Hug Width', exact: true }).check()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await canvas.undo()
  await expect(fill).toBeChecked()
  expect((await getSelectedNode(page))?.width).toBe(120)
  await canvas.undo()
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  canvas.assertNoErrors()
})

test('compact flex direction retains dimensions and keeps Fill and Hug mutually exclusive', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(150, 150, 350, 270)
  await canvas.drawRect(170, 170, 90, 30)
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Frame 1' }).first().click()
  const inspector = page.getByTestId('properties-panel')
  await inspector.getByRole('button', { name: 'Vertical layout', exact: true }).click()
  await expect.poll(async () => (await getSelectedNode(page))?.width).toBe(200)
  await expect.poll(async () => (await getSelectedNode(page))?.height).toBe(120)
  const fill = inspector.getByRole('checkbox', { name: 'Fill Width', exact: true })
  const hug = inspector.getByRole('checkbox', { name: 'Hug Width', exact: true })
  await expect(hug).not.toBeChecked()
  await fill.check()
  await expect(hug).not.toBeChecked()
  await hug.check()
  await expect(fill).not.toBeChecked()
  await expect.poll(async () => (await getSelectedNode(page))?.width).toBe(90)
  await inspector.getByRole('button', { name: 'Horizontal layout', exact: true }).click()
  await expect(hug).toBeChecked()
  await expect.poll(async () => (await getSelectedNode(page))?.height).toBe(120)
  await canvas.undo()
  await expect(
    inspector.getByRole('button', { name: 'Vertical layout', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(hug).toBeChecked()
  canvas.assertNoErrors()
})

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
