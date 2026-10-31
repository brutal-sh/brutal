import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('vertical toolbar arrows move focus without selecting a tool', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const toolbar = page.getByTestId('toolbar')
  await expect(toolbar).toHaveAttribute('role', 'toolbar')
  await expect(toolbar).toHaveAttribute('aria-orientation', 'vertical')
  const buttons = toolbar.getByRole('button')
  const first = buttons.first()
  await first.focus()
  const previousTool = await page.evaluate(() => window.openPencil?.getStore?.().state.activeTool)
  await first.press('ArrowDown')
  await expect(buttons.nth(1)).toBeFocused()
  expect(await page.evaluate(() => window.openPencil?.getStore?.().state.activeTool)).toBe(
    previousTool
  )
  await buttons.nth(1).press('End')
  await expect(buttons.last()).toBeFocused()
  await buttons.last().press('Home')
  await expect(first).toBeFocused()
  canvas.assertNoErrors()
})
