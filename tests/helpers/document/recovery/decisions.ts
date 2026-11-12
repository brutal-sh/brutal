import { readFile } from 'node:fs/promises'

import { expect, type Dialog, type Page } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

export const TARGET_DRAFT = 'Decision target'
export const UNRELATED_DRAFT = 'Unrelated recovery draft'

export function recoveryRow(page: Page, name: string) {
  return page
    .getByRole('alertdialog', { name: 'Recover unsaved work' })
    .locator('div')
    .filter({ has: page.getByText(name, { exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Restore', exact: true }) })
    .last()
}

export async function reloadRecovery(page: Page) {
  const accept = (dialog: Dialog) => dialog.accept()
  page.on('dialog', accept)
  try {
    await page.reload()
  } finally {
    page.off('dialog', accept)
  }
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeVisible()
}

export async function prepareUnrelatedDrafts(page: Page) {
  await page.goto('/?recent-files')
  const canvas = new CanvasHelper(page)
  let target: Awaited<ReturnType<typeof recoveryBytes>>[number] | undefined
  for (const [name, width, height, count] of [
    [TARGET_DRAFT, 123, 76, 1],
    [UNRELATED_DRAFT, 91, 53, 2]
  ] as const) {
    await page.getByTestId('tabbar-new').click()
    await canvas.waitForInit()
    await page.evaluate((name) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing draft editor')
      store.state.documentName = name
    }, name)
    await canvas.drawRect(220, 220, width, height)
    // Fixture persistence isolates decision behavior; automatic debounce has its own controls.
    await page.evaluate(async () => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing draft editor')
      await store.persistRecoveryNow()
    })
    await expect.poll(async () => (await recoveryBytes(page)).length).toBe(count)
    if (count === 1) target = (await recoveryBytes(page))[0]
  }
  const both = await recoveryBytes(page)
  expect(both).toHaveLength(2)
  if (!target) throw new Error('Missing target backup')
  const unrelated = both.find((snapshot) => snapshot.digest !== target.digest)
  if (!unrelated) throw new Error('Missing distinct unrelated backup')
  await reloadRecovery(page)
  await expect(recoveryRow(page, TARGET_DRAFT)).toBeVisible()
  await expect(recoveryRow(page, UNRELATED_DRAFT)).toBeVisible()
  expect(await recoveryBytes(page)).toEqual(both)
  return { canvas, both, unrelated }
}

export async function restoreDraft(page: Page, name: string) {
  await recoveryRow(page, name).getByRole('button', { name: 'Restore', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Recover unsaved work' })
  if (await dialog.isVisible())
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await new CanvasHelper(page).waitForInit()
}

export async function saveDraftDownload(page: Page, saveAs: boolean) {
  const restore = await page.evaluateHandle(() => {
    const original = window.showSaveFilePicker
    window.showSaveFilePicker = undefined
    return () => {
      window.showSaveFilePicker = original
    }
  })
  try {
    page.once('dialog', (dialog) => dialog.accept('decision-target.pen'))
    const downloading = page.waitForEvent('download')
    const menu = await openAppMenu(page, 'File')
    await menu
      .getByRole('menuitem', { name: saveAs ? /^Save as…/ : /^Save(?:\s|$)/ })
      .first()
      .click()
    const download = await downloading
    expect(download.suggestedFilename()).toBe('decision-target.pen')
    const document = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
      name: 'decision-target.pen',
      data: await readFile(await download.path())
    })
    const rectangles = [...document.graph.nodes.values()].filter(
      (node) => node.type === 'RECTANGLE'
    )
    expect(rectangles).toHaveLength(1)
    expect(rectangles[0]).toMatchObject({ width: 123, height: 76 })
  } finally {
    await restore.evaluate((reset) => reset())
    await restore.dispose()
  }
}

export async function expectUnrelatedEditable(page: Page, canvas: CanvasHelper) {
  await restoreDraft(page, UNRELATED_DRAFT)
  expect(
    await page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing restored unrelated draft')
      return store.graph.getChildren(store.state.currentPageId).map((node) => ({
        type: node.type,
        width: node.width,
        height: node.height
      }))
    })
  ).toEqual([{ type: 'RECTANGLE', width: 91, height: 53 }])
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  canvas.assertNoErrors()
}
