import { readFile } from 'node:fs/promises'

import type { Page } from '@playwright/test'

import { parseFigBuffer } from '@open-pencil/fig'
import { loadFigDataDecompressor } from '@open-pencil/kiwi/fig/container'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { fillDriver } from '#tests/helpers/canvas/fill-driver'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { propertyItems } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useIsolatedEditorSetupWithClear('/', async (page) => {
  await mockOfficialCloudDiscovery(page)
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
})

test.beforeEach(async () => {
  const page = editor.page
  await editor.canvas.drawRect(120, 100, 160, 120)
  await propertyItems(page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await page.getByTestId('fill-picker-tab-image').click()
  const bytes = await page.evaluate(async () => {
    const tile = document.createElement('canvas')
    tile.width = 24
    tile.height = 24
    const context = tile.getContext('2d')
    if (!context) throw new Error('Missing owned image encoder')
    context.fillStyle = '#2563eb'
    context.fillRect(0, 0, 24, 24)
    context.fillStyle = '#f59e0b'
    context.fillRect(0, 0, 12, 12)
    const blob = await new Promise<Blob>((resolve, reject) => {
      tile.toBlob((value) => {
        if (value) resolve(value)
        else reject(new Error('Owned PNG encoding failed'))
      }, 'image/png')
    })
    return [...new Uint8Array(await blob.arrayBuffer())]
  })
  const choosing = page.waitForEvent('filechooser')
  await page.getByTestId('fill-picker-choose-image').click()
  await (
    await choosing
  ).setFiles({ name: 'owned-tile.png', mimeType: 'image/png', buffer: Buffer.from(bytes) })
  await page
    .locator('[data-picker-content]')
    .getByRole('combobox')
    .filter({ hasText: /^Fill$/ })
    .click()
  await page.getByRole('option', { name: 'Tile', exact: true }).click()
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node?.fills[0].imageHash) throw new Error('Missing uploaded image fixture')
    store.updateNode(node.id, { fills: [{ ...node.fills[0], scale: 0.123456 }] })
  })
  expect((await getSelectedNode(page))?.fills[0]).toMatchObject({
    type: 'IMAGE',
    imageScaleMode: 'TILE',
    scale: 0.123456
  })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picker-content]')).toHaveCount(0)
  await fillDriver(() => page).clearHistory()
  await propertyItems(page, 'fills').first().getByTestId('fill-picker-swatch').click()
})

test('tile scale commits an explicit result equal to its rounded display', async () => {
  const field = editor.page.getByRole('spinbutton', { name: 'Tile scale', exact: true })
  await field.focus()
  await field.fill('6*2')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.12)
  editor.canvas.assertNoErrors()
})

test('tile scale cancels a live preview with full original precision', async () => {
  const field = editor.page.getByRole('spinbutton', { name: 'Tile scale', exact: true })
  await field.focus()
  await field.fill('77')
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.77)
  await field.press('Escape')
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.123456)
  editor.canvas.assertNoErrors()
})

test('untouched tile scale retains precision and image identity', async () => {
  const before = await getSelectedNode(editor.page)
  const field = editor.page.getByRole('spinbutton', { name: 'Tile scale', exact: true })
  await field.focus()
  await field.press('Tab')
  expect((await getSelectedNode(editor.page))?.fills[0]).toEqual(before?.fills[0])
  if (!(await editor.page.locator('[data-picker-content]').isVisible()))
    await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await field.focus()
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0]).toEqual(before?.fills[0])
  editor.canvas.assertNoErrors()
})

test('tile arithmetic retains history, invalid values and its positive minimum', async () => {
  const field = editor.page.getByRole('spinbutton', { name: 'Tile scale', exact: true })
  await field.focus()
  await field.fill('5*4')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.2)
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.123456)
  await editor.canvas.redo()
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.2)
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  for (const invalid of ['1+', '1/0']) {
    await field.focus()
    await field.fill(invalid)
    await field.press('Enter')
    expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.2)
  }
  await field.focus()
  await field.fill('-10')
  await field.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0].scale).toBe(0.01)
  editor.canvas.assertNoErrors()
})

async function selectedImageBytes(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const hash = store?.getSelectedNodes()[0]?.fills[0].imageHash
    const bytes = hash ? store?.getImage(hash) : undefined
    if (!bytes) throw new Error('Missing owned image bytes')
    return [...bytes]
  })
}

test('tile scale and original image bytes survive a saved FIG reopen', async ({ page }, info) => {
  const field = page.getByRole('spinbutton', { name: 'Tile scale', exact: true })
  await field.focus()
  await field.fill('25*2')
  await field.press('Enter')
  const before = await getSelectedNode(page)
  expect(before?.fills[0].scale).toBe(0.5)
  const original = await selectedImageBytes(page)
  await info.attach('tile-scale-picker', {
    body: await page.locator('[data-picker-content]').screenshot({ animations: 'disabled' }),
    contentType: 'image/png'
  })
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picker-content]')).toHaveCount(0)
  page.once('dialog', (dialog) => dialog.accept('image-tile-scale.fig'))
  const saving = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const path = info.outputPath('image-tile-scale.fig')
  await (await saving).saveAs(path)
  await loadFigDataDecompressor()
  const saved = parseFigBuffer(new Uint8Array(await readFile(path)).buffer)
  expect(saved.images.map(([, bytes]) => Array.from(bytes))).toEqual([original])
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (await opening).setFiles(path)
  await editor.canvas.waitForInit()
  await editor.canvas.selectAll()
  expect(await getSelectedNode(page)).toMatchObject({
    x: before?.x,
    y: before?.y,
    width: before?.width,
    height: before?.height,
    fills: [{ type: 'IMAGE', imageScaleMode: 'TILE', scale: 0.5 }]
  })
  expect(await selectedImageBytes(page)).toEqual(original)
  editor.canvas.assertNoErrors()
})
