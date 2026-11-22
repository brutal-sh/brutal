import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'

async function openSettings(page: Page) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
}

test('Home accent arithmetic works before any document is opened and persists', async ({
  page
}) => {
  const canvas = new CanvasHelper(page)
  await mockOfficialCloudDiscovery(page)
  await page.goto('/?recent-files')
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect(page.getByTestId('tabbar-close')).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(0)
  await openSettings(page)
  await page.getByTestId('settings-accent-custom').click()
  const red = page.getByRole('spinbutton', { name: 'Red', exact: true })
  await red.focus()
  await red.press('ControlOrMeta+a')
  await red.pressSequentially('120*2')
  await red.press('Enter')
  await red.focus()
  await expect(red).toHaveValue('240')
  await page.getByTestId('settings-accent-custom').click()
  await page.getByTestId('app-settings-done').click()
  await page.reload()
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await openSettings(page)
  await page.getByTestId('settings-accent-custom').click()
  await red.focus()
  await expect(red).toHaveValue('240')
  await red.press('Escape')
  await expect(page.locator('[data-picker-content]')).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible()
  canvas.assertNoErrors()
})

test('Appearance groups theme and animation controls and uses the persisted app theme', async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await openSettings(page)
  const appearance = page.getByRole('region', { name: 'Appearance', exact: true })
  await expect(appearance.getByRole('combobox', { name: 'Animations', exact: true })).toBeVisible()
  const theme = appearance.getByRole('combobox', { name: 'Theme', exact: true })
  await theme.click()
  await page.getByRole('option', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme-setting', 'light')
  await page.reload()
  await canvas.waitForInit()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await openSettings(page)
  await expect(theme).toHaveText('Light')
  await theme.click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await theme.click()
  await page.getByRole('option', { name: 'Auto', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme-setting', 'auto')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('Pointer preference mirrors the arrow hotspot, persists, and offers the system cursor', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const drawingSurface = page.getByTestId('canvas-area').locator('canvas').last()
  const cursor = () => drawingSurface.evaluate((element) => getComputedStyle(element).cursor)
  await expect.poll(cursor).toBe('default')
  const moveIcon = page.getByRole('button', { name: 'Move', exact: true }).locator('svg')
  await expect(moveIcon).toHaveCSS('scale', 'none')

  await openSettings(page)
  const pointer = page.getByRole('combobox', { name: 'Pointer', exact: true })
  await expect(pointer).toHaveText('System pointer')
  await pointer.click()
  await page.getByRole('option', { name: 'Right-handed', exact: true }).click()
  await expect(pointer).toHaveText('Right-handed')
  await expect.poll(cursor).toMatch(/ 5 5, default$/)
  await pointer.focus()
  await pointer.press('Space')
  const left = page.getByRole('option', { name: 'Left-handed', exact: true })
  await expect(left).toBeVisible()
  await left.focus()
  await left.press('Enter')
  await expect(pointer).toHaveText('Left-handed')
  await expect(pointer).toHaveCSS('cursor', / 19 5, pointer$/)
  await expect.poll(cursor).toMatch(/ 19 5, default$/)

  await page.reload()
  await canvas.waitForInit()
  await expect.poll(cursor).toMatch(/ 19 5, default$/)
  await expect(moveIcon).toHaveCSS('scale', '-1 1')
  await openSettings(page)
  await expect(pointer).toHaveText('Left-handed')
  await pointer.click()
  await page.getByRole('option', { name: 'System pointer', exact: true }).click()
  await page.getByTestId('app-settings-done').click()
  await expect.poll(cursor).toBe('default')

  await page.getByRole('button', { name: 'Text', exact: true }).click()
  await expect.poll(cursor).toBe('text')
  canvas.assertNoErrors()
})

test('Accent color recolors the interface, persists, and a cancelled custom pick restores it', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const accent = () =>
    page.evaluate(() => document.documentElement.style.getPropertyValue('--color-accent'))
  const initial = await accent()

  await openSettings(page)
  const presets = page.getByRole('radiogroup', { name: 'Accent color', exact: true })
  const green = presets.getByRole('radio', { name: 'Green', exact: true })
  await green.click()
  await expect(green).toBeChecked()
  await expect.poll(accent).not.toBe(initial)
  const chosen = await accent()

  await page.reload()
  await canvas.waitForInit()
  await expect.poll(accent).toBe(chosen)

  await openSettings(page)
  await page.getByTestId('settings-accent-custom').click()
  const red = page.getByRole('spinbutton', { name: 'Red', exact: true })
  await red.focus()
  await red.fill('0')
  await red.press('Enter')
  await expect(page.getByTestId('settings-accent-custom')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(accent).not.toBe(chosen)
  await page.keyboard.press('Escape')
  await expect.poll(accent).toBe(chosen)
  await expect(green).toBeChecked()
})
