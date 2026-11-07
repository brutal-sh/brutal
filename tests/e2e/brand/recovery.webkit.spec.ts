import { expect, test, type Locator, type TestInfo, type Page } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes, seedRecovery } from '#tests/helpers/document/recovery'

const LOCALES = [
  { locale: 'en', restore: 'Restore', discard: 'Discard', close: 'Close' },
  {
    locale: 'de',
    restore: 'Wiederherstellen',
    discard: 'Verwerfen',
    close: 'Schließen'
  },
  { locale: 'es', restore: 'Restaurar', discard: 'Descartar', close: 'Cerrar' },
  { locale: 'fr', restore: 'Restaurer', discard: 'Supprimer', close: 'Fermer' },
  { locale: 'it', restore: 'Ripristina', discard: 'Scarta', close: 'Chiudi' },
  { locale: 'ja', restore: '復元', discard: '破棄', close: '閉じる' },
  { locale: 'pl', restore: 'Przywróć', discard: 'Odrzuć', close: 'Zamknij' },
  {
    locale: 'ru',
    restore: 'Восстановить',
    discard: 'Удалить',
    close: 'Закрыть'
  },
  { locale: 'zh-CN', restore: '恢复', discard: '丢弃', close: '关闭' }
] as const

async function capture(dialog: Locator, testInfo: TestInfo, state: string) {
  await expect(dialog).toBeVisible()
  await dialog.screenshot({
    animations: 'disabled',
    path: testInfo.outputPath(`${state}.png`)
  })
  const layout = await dialog.evaluate((element) => ({
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
    controls: Array.from(element.querySelectorAll('button'), (button) => {
      const box = button.getBoundingClientRect()
      const parent = element.getBoundingClientRect()
      return {
        left: box.left - parent.left,
        right: box.right - parent.left,
        width: box.width
      }
    })
  }))
  await testInfo.attach(state, {
    body: JSON.stringify(layout),
    contentType: 'application/json'
  })
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
  for (const control of layout.controls) {
    expect(control.width).toBeGreaterThan(0)
    expect(control.left).toBeGreaterThanOrEqual(0)
    expect(control.right).toBeLessThanOrEqual(layout.width + 2)
  }
}

async function start(page: Page) {
  const interceptedURLs = await mockEditorCopyServices(page)
  const canvas = new CanvasHelper(page)
  await page.goto('/')
  await canvas.waitForInit()
  await seedRecovery(page)
  page.on('dialog', (dialog) => dialog.accept())
  return { canvas, interceptedURLs }
}

for (const labels of LOCALES) {
  test.describe(labels.locale, () => {
    test.use({ locale: labels.locale })
    test('Close retains the persisted snapshot', async ({ page }, testInfo) => {
      const { canvas, interceptedURLs } = await start(page)
      const original = await recoveryBytes(page)
      expect(original).toHaveLength(1)
      expect(original[0]?.bytes).toBeGreaterThan(3)
      await page.reload()
      const dialog = page.getByTestId('recovery-dialog')
      await capture(dialog, testInfo, 'recoverable')
      await dialog.getByRole('button', { name: labels.close, exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(await recoveryBytes(page)).toEqual(original)
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })

    test('Restore recovers the snapshot layers and geometry', async ({ page }) => {
      const { canvas, interceptedURLs } = await start(page)
      await page.reload()
      const dialog = page.getByTestId('recovery-dialog')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: labels.restore, exact: true }).click()
      await expect(dialog).toBeHidden()
      await canvas.waitForInit()
      await expect
        .poll(() =>
          page.evaluate(() => {
            const store = window.openPencil?.getStore?.()
            return store?.graph.getChildren(store.state.currentPageId).map((node) => ({
              name: node.name,
              width: node.width,
              height: node.height
            }))
          })
        )
        .toEqual([{ name: 'Recovery retention fixture', width: 240, height: 140 }])
      expect(await recoveryBytes(page)).toHaveLength(1)
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })

    test('failed Restore preserves the snapshot through Close', async ({ page }, testInfo) => {
      const { canvas, interceptedURLs } = await start(page)
      await recoveryBytes(page, true)
      const damaged = await recoveryBytes(page)
      expect(damaged).toHaveLength(1)
      expect(damaged[0]?.bytes).toBe(3)
      await page.reload()
      const dialog = page.getByTestId('recovery-dialog')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: labels.restore, exact: true }).click()
      await expect(dialog.getByRole('button', { name: labels.restore, exact: true })).toBeEnabled()
      const failure = page.locator('[data-slot="toast"][data-tone="error"]')
      await capture(failure, testInfo, 'restore-error')
      expect(await recoveryBytes(page)).toEqual(damaged)
      await capture(dialog, testInfo, 'failed-restore')
      await dialog.getByRole('button', { name: labels.close, exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(await recoveryBytes(page)).toEqual(damaged)
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })

    test('Discard removes the snapshot and stays discarded after launch', async ({
      page
    }, testInfo) => {
      const { canvas, interceptedURLs } = await start(page)
      expect(await recoveryBytes(page)).toHaveLength(1)
      await page.reload()
      const dialog = page.getByTestId('recovery-dialog')
      await capture(dialog, testInfo, 'before-discard')
      await dialog.getByRole('button', { name: labels.discard, exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(await recoveryBytes(page)).toEqual([])
      await page.reload()
      await canvas.waitForInit()
      await expect(dialog).toBeHidden()
      expect(await recoveryBytes(page)).toEqual([])
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })
  })
}
