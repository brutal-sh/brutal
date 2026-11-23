import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test.beforeEach(async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
})

test('brand menu uses keyboard navigation and restores trigger focus on Escape', async ({
  page
}, testInfo) => {
  const trigger = page.getByRole('button', { name: 'Main menu', exact: true })
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  const menu = page.getByRole('menu', { name: 'Main menu', exact: true })
  await expect(menu).toBeVisible()
  await expect(menu).toHaveCSS('width', '216px')
  const repository = menu.getByRole('menuitem', { name: 'Brutal on GitHub', exact: true })
  await expect(repository).toBeFocused()
  await expect(repository).toHaveAttribute('href', 'https://github.com/jpoindexter/brutal-editor')
  await expect(repository).toHaveCSS('height', '24px')
  await page.keyboard.press('End')
  await expect(menu.getByRole('menuitem', { name: 'Commands', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(menu.getByRole('menuitem', { name: 'Brutal CLI docs', exact: true })).toBeFocused()
  await expect(
    menu.getByRole('menuitem', { name: 'Brutal CLI docs', exact: true })
  ).toHaveAttribute('href', 'https://github.com/jpoindexter/brutal-editor#cli')
  await page.screenshot({ path: testInfo.outputPath('brand-menu.png') })
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('brand menu toggles real theme and UI visibility', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Main menu', exact: true })
  const themeBefore = await page.locator('html').getAttribute('data-theme')
  await trigger.click()
  await page.getByRole('menuitem', { name: 'Toggle Light/Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    themeBefore === 'light' ? 'dark' : 'light'
  )
  await expect(page.getByRole('menu', { name: 'Main menu', exact: true })).toBeHidden()
  await trigger.click()
  await page.getByRole('menuitem', { name: /Show\/Hide UI/ }).click()
  await expect(page.getByTestId('toolbar')).toBeHidden()
  await expect(page.getByTestId('editor-show-ui')).toBeVisible()
  await page.getByTestId('editor-show-ui').click()
  await expect(page.getByTestId('toolbar')).toBeVisible()
})

test('browser File and Edit commands remain actionable through the ellipsis palette', async ({
  page
}) => {
  const canvas = new CanvasHelper(page)
  await canvas.drawRect(300, 200, 100, 60)
  const tabs = page.getByTestId('tabbar-tab')
  const count = await tabs.count()
  const paletteButton = page.getByRole('button', { name: 'Command palette', exact: true })
  await paletteButton.click()
  const palette = page.getByRole('dialog', { name: 'Command palette', exact: true })
  const search = palette.getByRole('searchbox', { name: 'Search commands' })
  await search.fill('Undo')
  await palette.getByRole('option', { name: /^Undo/ }).click()
  await expect(palette).toBeHidden()
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  await expect(page.getByTestId('layers-item')).toHaveCount(0)
  await paletteButton.click()
  await search.fill('New')
  await palette.getByRole('option', { name: /^New(?:\s|$)/ }).click()
  await expect(tabs).toHaveCount(count + 1)
  canvas.assertNoErrors()
})
