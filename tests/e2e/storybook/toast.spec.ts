import { expect, test } from '@playwright/test'

test('determinate progress exposes its value and bar width', async ({ page }) => {
  await page.goto('/iframe.html?id=design-system-feedback-toast--download-progress&viewMode=story')

  const toast = page.locator('[data-slot="toast"]')
  await expect(toast).toHaveAttribute('data-progress', 'determinate')
  await expect(toast.locator('[data-slot="progress-label"]')).toHaveText(
    '42% · 9.6 MiB of 22.9 MiB'
  )

  const bar = toast.getByRole('progressbar')
  await expect(bar).toHaveAttribute('aria-valuenow', '42')
  await expect(bar).toHaveAttribute('aria-valuemin', '0')
  await expect(bar).toHaveAttribute('aria-valuemax', '100')
  await expect(toast.locator('[data-slot="progress-fill"]')).toHaveAttribute('style', /width: 42%/)
})

test('progress without a known total stays indeterminate', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=design-system-feedback-toast--download-progress-unknown-total&viewMode=story'
  )

  const toast = page.locator('[data-slot="toast"]')
  await expect(toast).toHaveAttribute('data-progress', 'indeterminate')
  await expect(toast.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow', /\d/)
  await expect(toast.locator('[data-slot="progress-label"]')).toHaveText('4.2 MiB downloaded')
})

test('a reported total flips between determinate, indeterminate, and cleared', async ({ page }) => {
  await page.clock.install()
  await page.goto('/iframe.html?id=design-system-feedback-toast--progress-lifecycle&viewMode=story')

  const toast = page.locator('[data-slot="toast"]')
  const bar = toast.getByRole('progressbar')
  await expect(toast).toHaveAttribute('data-progress', 'determinate')
  await expect(bar).toHaveAttribute('aria-valuenow', '0')

  // The bar follows the reported work and keeps the toast open instead of expiring.
  await page.getByRole('button', { name: 'Advance download' }).click()
  await expect(bar).toHaveAttribute('aria-valuenow', '13')
  await expect(toast.locator('[data-slot="progress-label"]')).toHaveText(
    '13% · 2.9 MiB of 22.9 MiB'
  )
  await page.clock.fastForward(3_500)
  await expect(toast).toBeVisible()

  // Losing the total must drop the value rather than pinning the bar at 13%.
  await page.getByRole('button', { name: 'Unknown total' }).click()
  await expect(toast).toHaveAttribute('data-progress', 'indeterminate')
  await expect(bar).not.toHaveAttribute('aria-valuenow', /\d/)

  // Clearing progress removes the bar and returns the toast to auto-dismissal.
  await page.getByRole('button', { name: 'Clear progress' }).click()
  await expect(toast).toHaveAttribute('data-progress', 'none')
  await expect(toast.getByRole('progressbar')).toHaveCount(0)
  await page.clock.fastForward(3_500)
  await expect(toast).toBeHidden()
})

test('resuming progress cancels the pending auto-dismissal', async ({ page }) => {
  await page.clock.install()
  await page.goto('/iframe.html?id=design-system-feedback-toast--progress-lifecycle&viewMode=story')

  const toast = page.locator('[data-slot="toast"]')
  await expect(toast).toHaveAttribute('data-progress', 'determinate')
  await page.getByRole('button', { name: 'Clear progress' }).click()
  await expect(toast).toHaveAttribute('data-progress', 'none')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(toast).toHaveAttribute('data-progress', 'determinate')

  // Advance beyond the timer installed before progress resumed.
  await page.clock.fastForward(3_500)
  await expect(toast).toBeVisible()
  await page.getByRole('button', { name: 'Advance download' }).click()
  await expect(toast.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '13')
})

test('an action toast renders its action', async ({ page }) => {
  await page.goto('/iframe.html?id=design-system-feedback-toast--with-action&viewMode=story')

  const toast = page.locator('[data-slot="toast"]')
  await expect(toast).toContainText('Design file moved to Trash.')
  await expect(toast.getByRole('button', { name: 'Undo' })).toBeVisible()
})

test('a short confirmation keeps its status icon beside the message', async ({
  page
}, testInfo) => {
  await page.goto(
    '/iframe.html?id=design-system-feedback-toast--default&viewMode=story&globals=theme:dark&args=message:Brutal%20is%20up%20to%20date'
  )

  const toast = page.locator('[data-slot="toast"]')
  const text = toast.getByText('Brutal is up to date', { exact: true })
  await expect(text).toBeVisible()
  await expect(toast).toHaveCSS('border-top-left-radius', '12px')
  for (const width of [800, 290]) {
    await page.setViewportSize({ width, height: 600 })
    const icon = await toast.locator('svg').boundingBox()
    const message = await text.boundingBox()
    if (!icon || !message) throw new Error('The notification did not render')
    expect(icon.y).toBeLessThan(message.y + message.height)
    expect(icon.y + icon.height).toBeGreaterThan(message.y)
    expect(icon.x + icon.width).toBeLessThanOrEqual(message.x)
    const lineHeight = await text.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).lineHeight)
    )
    expect(message.height).toBeLessThanOrEqual(lineHeight + 1)
  }
  await toast.screenshot({ path: testInfo.outputPath('update-confirmation.png') })
})

test('the update notice opens the installed release notes and keeps the status on one row', async ({
  page
}, testInfo) => {
  const release = 'https://github.com/brutal-sh/brutal-feedback/releases/tag/v0.16.0-beta.14'
  await page.context().route(release, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Brutal Beta 14 release notes</title>'
    })
  )
  await page.goto(
    '/iframe.html?id=app-shell-notifications--up-to-date-with-release-notes&viewMode=story&globals=theme:dark'
  )
  await page.getByRole('button', { name: 'Show update notice' }).click()
  const toast = page.locator('[data-slot="toast"]')
  const message = toast.getByText('Brutal is up to date', { exact: true })
  const link = toast.getByRole('link', { name: 'Full release notes', exact: true })
  await expect(link).toHaveAttribute('href', release)
  await expect(toast).toHaveCSS('border-top-left-radius', '12px')

  for (const width of [800, 290]) {
    await page.setViewportSize({ width, height: 600 })
    const icon = await toast.locator('svg').first().boundingBox()
    const text = await message.boundingBox()
    if (!icon || !text) throw new Error('The update confirmation did not render')
    expect(icon.y + icon.height).toBeGreaterThan(text.y)
    expect(icon.x + icon.width).toBeLessThanOrEqual(text.x)
    const lineHeight = await message.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).lineHeight)
    )
    expect(text.height).toBeLessThanOrEqual(lineHeight + 1)
    await expect(link).toBeInViewport()
  }

  await page.setViewportSize({ width: 800, height: 600 })
  await toast.screenshot({ path: testInfo.outputPath('up-to-date-with-release-notes.png') })
  await link.focus()
  const opened = page.waitForEvent('popup')
  await page.keyboard.press('Enter')
  const releasePage = await opened
  await expect(releasePage).toHaveURL(release)
  await expect(releasePage).toHaveTitle('Brutal Beta 14 release notes')
  await releasePage.close()
})
