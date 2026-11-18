import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'

test.beforeEach(async ({ page }) => {
  await mockOfficialCloudDiscovery(page)
})

const design = JSON.stringify({
  version: '2.7',
  children: [
    { id: 'slide', type: 'frame', name: 'Slide', width: 640, height: 360, fill: '#ffffff' }
  ]
})

test('a fresh drawing saves as .pen by default and reopens with editable layers', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.evaluate(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await canvas.drawRect(220, 220, 160, 80)
  page.once('dialog', async (dialog) => {
    expect(dialog.defaultValue()).toBe('Untitled.pen')
    await dialog.accept(dialog.defaultValue())
  })
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await download
  expect(saved.suggestedFilename()).toBe('Untitled.pen')
  const bytes = await readFile(await saved.path())
  const imported = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
    name: saved.suggestedFilename(),
    data: bytes
  })
  expect(imported.sourceFormat).toBe('pen')
  expect(imported.graph.getChildren(imported.graph.getPages()[0].id)[0]).toMatchObject({
    type: 'RECTANGLE',
    width: 160,
    height: 80
  })
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({
    name: 'reopened.pen',
    mimeType: 'application/json',
    buffer: bytes
  })
  await expect(page.getByRole('tab', { name: /reopened/ })).toBeVisible()
  await canvas.waitForInit()
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  const layers = page.getByTestId('layers-item')
  await expect(layers).toHaveCount(1)
  await layers.first().click()
  await canvas.duplicate()
  await expect(layers).toHaveCount(2)
  await canvas.undo()
  await expect(layers).toHaveCount(1)
  canvas.assertNoErrors()
})

test('opening, editing and saving a .pen downloads .pen bytes that can be reopened', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  // Exercise the supported download fallback using an actual file input and download.
  const picker = await page.evaluateHandle(() => {
    const originalOpen = window.showOpenFilePicker
    const originalSave = window.showSaveFilePicker
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
    return {
      restore: () => {
        window.showOpenFilePicker = originalOpen
        window.showSaveFilePicker = originalSave
      }
    }
  })
  try {
    const menu = await openAppMenu(page, 'File')
    const chooser = page.waitForEvent('filechooser')
    await menu.getByRole('menuitem', { name: /^Open…/ }).click()
    await (
      await chooser
    ).setFiles({ name: 'slides.pen', mimeType: 'application/json', buffer: Buffer.from(design) })
    await expect(page.getByRole('tab', { name: /slides/ })).toBeVisible()
    await canvas.waitForInit()
    await canvas.drawRect(300, 240, 100, 60)
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
    const download = page.waitForEvent('download')
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
      .filter({ hasText: /^Save/ })
      .first()
      .click()
    const saved = await download
    expect(saved.suggestedFilename()).toBe('slides.pen')
    const imported = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
      name: saved.suggestedFilename(),
      data: await readFile(await saved.path())
    })
    expect(imported.sourceFormat).toBe('pen')
    expect(
      [...imported.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
    ).toHaveLength(1)
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()

    page.once('dialog', (dialog) => dialog.accept('renamed.pen'))
    const renamedDownload = page.waitForEvent('download')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
    const renamed = await renamedDownload
    expect(renamed.suggestedFilename()).toBe('renamed.pen')
    const renamedFile = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
      name: renamed.suggestedFilename(),
      data: await readFile(await renamed.path())
    })
    expect(renamedFile.sourceFormat).toBe('pen')
    expect(
      [...renamedFile.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
    ).toHaveLength(1)
    canvas.assertNoErrors()
  } finally {
    await picker.evaluate((handle) => handle.restore())
    await picker.dispose()
  }
})
