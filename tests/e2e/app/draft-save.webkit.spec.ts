import { readFile } from 'node:fs/promises'

import { expect, test, type Dialog, type Page } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

async function showLayers(page: Page) {
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
}

async function recoverAutomaticDraft(page: Page) {
  await page.goto('/?recent-files')
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('button', { name: 'New design', exact: true }).click()
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(220, 220, 160, 80)
  await page.getByRole('tab', { name: 'Home', exact: true }).click()
  await home.getByRole('tab', { name: 'Drafts', exact: true }).click()
  await expect.poll(async () => (await recoveryBytes(page)).length).toBe(1)
  await expect(home.getByRole('button', { name: /^Untitled / })).toHaveCount(1)
  await page.screenshot({ path: test.info().outputPath('automatic-draft.png') })
  const acceptUnload = (dialog: Dialog) => dialog.accept()
  page.on('dialog', acceptUnload)
  try {
    await page.reload()
  } finally {
    page.off('dialog', acceptUnload)
  }
  const recovery = page.getByRole('alertdialog', { name: 'Recover unsaved work' })
  await expect(recovery).toBeVisible()
  await recovery.getByRole('button', { name: 'Restore', exact: true }).click()
  await canvas.waitForInit()
  await showLayers(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  return canvas
}

async function saveAsDownload(page: Page, name: string) {
  await page.evaluate(() => {
    window.showSaveFilePicker = undefined
    window.showOpenFilePicker = undefined
  })
  page.once('dialog', (dialog) => dialog.accept(name))
  const downloading = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const downloaded = await downloading
  expect(downloaded.suggestedFilename()).toBe(name)
  return readFile(await downloaded.path())
}

async function expectRectangles(bytes: Uint8Array, count: number) {
  const document = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
    name: 'draft.pen',
    data: bytes
  })
  expect(document.sourceFormat).toBe('pen')
  const rectangles = [...document.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
  expect(rectangles).toHaveLength(count)
  for (const rectangle of rectangles) expect(rectangle).toMatchObject({ width: 160, height: 80 })
}

test('an automatic draft restores its content after reload and survives cancelling close', async ({
  page
}) => {
  const canvas = await recoverAutomaticDraft(page)
  const before = await recoveryBytes(page)
  await page.getByTestId('tabbar-close').click()
  const close = page.getByRole('alertdialog', { name: /Save changes to/ })
  await expect(close).toBeVisible()
  await close.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  expect(await recoveryBytes(page)).toEqual(before)
  const bytes = await saveAsDownload(page, 'restored-draft.pen')
  await expectRectangles(bytes, 1)
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
  await page.getByRole('tab', { name: 'Home', exact: true }).click()
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('tab', { name: 'Drafts', exact: true }).click()
  await expect(home.getByText('No drafts yet', { exact: true })).toBeVisible()
  canvas.assertNoErrors()
})

test('a recovered draft saves, retains edits and history, and reopens as editable pen content', async ({
  page
}) => {
  const canvas = await recoverAutomaticDraft(page)
  await expectRectangles(await saveAsDownload(page, 'first-design.pen'), 1)
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await canvas.redo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  const downloading = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const downloaded = await downloading
  expect(downloaded.suggestedFilename()).toBe('first-design.pen')
  const bytes = await readFile(await downloaded.path())
  await expectRectangles(bytes, 2)
  const choosing = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await choosing
  ).setFiles({ name: 'reopened-draft.pen', mimeType: 'application/json', buffer: bytes })
  await expect(page.getByRole('tab', { name: /reopened-draft/ })).toBeVisible()
  await canvas.waitForInit()
  await showLayers(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(3)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  canvas.assertNoErrors()
})
