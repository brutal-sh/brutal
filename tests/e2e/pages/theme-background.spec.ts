import { expect, test, type Page } from '@playwright/test'

// The independent editor uses Pen's observed dark canvas default, #18181B.
// These specs open the app without CanvasHelper, whose init keeps other specs on the light page.

const DARK = 0x18 / 255
const LIGHT = 0.96

async function openFresh(page: Page) {
  await page.goto('/')
  await page.getByTestId('canvas-element').and(page.locator('[data-ready="1"]')).waitFor()
  await page.locator('#loader').waitFor({ state: 'detached' })
}

function currentPageColor(page: Page) {
  return page.evaluate(() => window.openPencil?.getStore?.()?.state.pageColor.r)
}

test('a new document and its new pages take the dark page in the dark theme', async ({ page }) => {
  await openFresh(page)
  expect(await currentPageColor(page)).toBeCloseTo(DARK, 3)
  const pageId = await page.evaluate(() => window.openPencil?.getStore?.()?.addPage())
  await expect
    .poll(() => page.evaluate(() => window.openPencil?.getStore?.()?.state.currentPageId))
    .toBe(pageId)
  expect(await currentPageColor(page)).toBeCloseTo(DARK, 3)
})

test('the light theme starts documents on the light page', async ({ page }) => {
  await openFresh(page)
  await page.getByRole('button', { name: 'Main menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Toggle Light/Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  // The theme setting persists, so the reloaded app starts a new document in it.
  await page.reload()
  await page.getByTestId('canvas-element').and(page.locator('[data-ready="1"]')).waitFor()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await currentPageColor(page)).toBeCloseTo(LIGHT, 3)
})
