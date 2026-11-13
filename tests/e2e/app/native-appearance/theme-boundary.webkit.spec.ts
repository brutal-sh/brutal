import { expect, test } from '@playwright/test'

for (const role of ['main', 'updater'] as const) {
  test(`${role} keeps native appearance requests in the main window`, async ({ page }) => {
    const requests: string[] = []
    page.on('console', (message) => {
      const prefix = 'owned-native-theme '
      if (message.text().startsWith(prefix)) requests.push(message.text().slice(prefix.length))
    })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`/tests/e2e/app/native-appearance/fixture.html?window=${role}`)
    const light = page.getByRole('button', { name: 'Use Light', exact: true })
    await expect(light).toBeEnabled()
    if (role === 'main') await expect.poll(() => requests.includes('dark')).toBe(true)
    await light.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    if (role === 'main') await expect.poll(() => requests.includes('light')).toBe(true)
    await page.getByRole('button', { name: 'Use Auto', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme-setting', 'auto')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    if (role === 'main') await expect.poll(() => requests.includes('null')).toBe(true)
    else expect(requests).toEqual([])
  })
}
