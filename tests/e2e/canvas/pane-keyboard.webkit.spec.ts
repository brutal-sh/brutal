import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('keyboard opens pane split menus and closes nested views', async ({ page }, info) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openAppMenu(page, 'View')
  await page.getByRole('menuitem', { name: 'Split right', exact: true }).click()
  const headers = page.locator('[data-slot="canvas-pane-header"]')
  await expect(headers).toHaveCount(2)
  const split = headers
    .last()
    .getByRole('button', { name: 'Split right / Split down', exact: true })
  await split.focus()
  await expect(split).toBeFocused()
  await split.press('Enter')
  await page.getByRole('menuitem', { name: 'Split down', exact: true }).press('Enter')
  await expect(headers).toHaveCount(3)
  await page.screenshot({ path: info.outputPath('keyboard-nested.png') })
  for (const remaining of [2, 1]) {
    const close = headers.last().getByRole('button', { name: 'Close view', exact: true })
    await close.focus()
    await expect(close).toBeFocused()
    await close.press('Enter')
    await expect(headers).toHaveCount(remaining === 1 ? 0 : remaining)
  }
  canvas.assertNoErrors()
})
