import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('File SVG exports selected objects separately and a single object directly', async ({
  page
}, info) => {
  await page.addInitScript(() => {
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test&no-rulers')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const ids = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const first = store.createShape('RECTANGLE', 40, 80, 240, 160)
    const second = store.createShape('RECTANGLE', 360, 80, 120, 80)
    store.graph.updateNode(first, { name: 'First object' })
    store.graph.updateNode(second, { name: 'Second object' })
    store.select([first, second])
    store.requestRender()
    return [first, second]
  })
  await canvas.waitForRender()

  async function downloadSVG() {
    const menu = await openAppMenu(page, 'File')
    await menu.getByRole('menuitem', { name: 'Export selection…', exact: true }).hover()
    const downloading = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'SVG', exact: true }).click()
    return downloading
  }

  const batch = await downloadSVG()
  expect(batch.suggestedFilename()).toBe('export.zip')
  const batchPath = info.outputPath('selection.zip')
  await batch.saveAs(batchPath)
  const files = unzipSync(new Uint8Array(await readFile(batchPath)))
  expect(Object.keys(files)).toEqual(['First object.svg', 'Second object.svg'])
  expect(strFromU8(files['First object.svg'])).toContain('viewBox="0 0 240 160"')
  expect(strFromU8(files['Second object.svg'])).toContain('viewBox="0 0 120 80"')
  expect(
    await page.evaluate(() => [...(window.openPencil?.getStore?.().state.selectedIds ?? [])])
  ).toEqual(ids)

  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), ids[0])
  const single = await downloadSVG()
  expect(single.suggestedFilename()).toBe('First object.svg')
  const singlePath = info.outputPath('single.svg')
  await single.saveAs(singlePath)
  expect(new Uint8Array(await readFile(singlePath))).toEqual(files['First object.svg'])
  canvas.assertNoErrors()
})
