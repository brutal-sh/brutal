import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

function currentDocument(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing current design')
    return {
      recoveryId: store.getRecoveryId(),
      dirty: store.hasUnsavedChanges(),
      nodes: store.graph
        .getChildren(store.state.currentPageId)
        .map((node) => ({ id: node.id, type: node.type, width: node.width, height: node.height }))
    }
  })
}

async function importFontCopy(page: Page) {
  const restore = await page.evaluateHandle(() => {
    const original = window.showOpenFilePicker
    window.showOpenFilePicker = undefined
    return () => {
      window.showOpenFilePicker = original
    }
  })
  try {
    const choosing = page.waitForEvent('filechooser')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
    await (
      await choosing
    ).setFiles({
      name: 'custom-font.pen',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          version: '2.22',
          fonts: [{ name: 'Fixture Relative Inter', url: './font.ttf' }],
          children: [{ id: 'incoming', type: 'rectangle', width: 64, height: 32 }]
        })
      )
    })
  } finally {
    await restore.evaluate((reset) => reset())
    await restore.dispose()
  }
}

test('custom-font import refusal keeps the current dirty design and exact recovery backup', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(100, 100, 120, 80)
  await page.evaluate(async () => {
    await window.openPencil?.getStore?.().persistRecoveryNow()
  })
  const before = await currentDocument(page)
  expect(before.dirty).toBe(true)
  const backup = await recoveryBytes(page)
  expect(backup).toHaveLength(1)
  await importFontCopy(page)
  const error = page.getByRole('region', { name: /Notifications/ }).getByRole('listitem')
  await expect(error).toBeVisible()
  await expect(error).toHaveAttribute('data-tone', 'error')
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(1)
  expect(await currentDocument(page)).toEqual(before)
  expect(await recoveryBytes(page)).toEqual(backup)
})
