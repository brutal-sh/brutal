import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { clickDepthDriver } from '#tests/helpers/canvas/click-depth/driver'

test('dragging selected nested instance content reorders its auto-layout item', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  canvas.errors.length = 0
  await canvas.clearCanvas()

  const ids = await clickDepthDriver(() => page).dragRow(true)
  await canvas.waitForRender()

  const driver = clickDepthDriver(() => page)
  const from = await driver.at(ids.secondText, 40, 12)
  const to = await driver.at(ids.first, 20, 20)
  await canvas.dragBetween(from, to, 12)
  await canvas.waitForRender()

  const childIds = await page.evaluate((frameId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.graph.getNode(frameId)?.childIds ?? []
  }, ids.frame)

  expect(childIds).toEqual([ids.second, ids.first])
  canvas.assertNoErrors()
})

test('auto-layout drag does not show an insert indicator before order changes', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  canvas.errors.length = 0
  await canvas.clearCanvas()

  const ids = await clickDepthDriver(() => page).dragRow(false)
  await canvas.waitForRender()

  const box = await canvas.canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  const from = await clickDepthDriver(() => page).at(ids.secondText, 40, 12)
  await page.mouse.move(box.x + from.x, box.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + from.x - 5, box.y + from.y, { steps: 3 })
  await canvas.waitForRender()

  const indicator = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.state.layoutInsertIndicator
  })
  await page.mouse.up()

  expect(indicator).toBeNull()

  const childIds = await page.evaluate((frameId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.graph.getNode(frameId)?.childIds ?? []
  }, ids.frame)
  expect(childIds).toEqual([ids.first, ids.second])
  canvas.assertNoErrors()
})
