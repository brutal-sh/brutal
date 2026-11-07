import { expect, test } from '@playwright/test'

const BROWSERS = [
  ['chrome', 'Mozilla/5.0 (Windows NT 10.0) Chrome/105.0.0.0 Safari/537.36'],
  ['edge', 'Mozilla/5.0 (Windows NT 10.0) Chrome/109.0.0.0 Safari/537.36 Edg/109.0'],
  ['firefox', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/115.0'],
  ['safari', 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/16.2 Safari/605.1.15'],
  ['opera', 'Mozilla/5.0 (Windows NT 10.0) Chrome/108.0.0.0 Safari/537.36 OPR/94.0'],
  ['ios', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) Version/16.1 Safari/604.1'],
  ['unknown', 'Open Pen support fixture'],
  ['supported-version', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36']
] as const

for (const [name, userAgent] of BROWSERS) {
  test.describe(name, () => {
    test.use({ userAgent })
    for (const theme of ['dark', 'light'] as const) {
      test(`pre-boot guidance preserves details and own links in ${theme}`, async ({
        page,
        context
      }, testInfo) => {
        const errors: string[] = []
        const requests: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await context.route('https://github.com/jpoindexter/open-pen/**', async (route) => {
          requests.push(route.request().url())
          await route.fulfill({
            contentType: 'text/html',
            body: '<title>Open Pen support fixture</title>'
          })
        })
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript(() => {
          Reflect.deleteProperty(String.prototype, 'isWellFormed')
        })
        await page.goto('/')
        const notice = page.getByRole('alert')
        await expect(notice).toBeVisible()
        await expect(page.locator('canvas')).toHaveCount(0)
        await expect(notice.getByRole('img')).toHaveCount(0)
        await expect(notice.locator('img')).toHaveAttribute('src', '/brand/app-icon.svg')
        await expect
          .poll(() =>
            notice
              .locator('img')
              .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0)
          )
          .toBe(true)
        const requirements = notice.getByRole('link', { name: 'System requirements' })
        await expect(requirements).toHaveAttribute(
          'href',
          'https://github.com/jpoindexter/open-pen/blob/HEAD/README.md#open-pen-system-requirements'
        )
        const report = notice.getByRole('link', { name: 'Report a problem' })
        const href = new URL((await report.getAttribute('href')) ?? '')
        expect(href.origin + href.pathname).toBe(
          'https://github.com/jpoindexter/open-pen/issues/new'
        )
        expect(href.searchParams.get('platform')).toBe('Web (Open Pen)')
        expect(href.searchParams.get('logs')).toContain(userAgent)
        expect(href.searchParams.get('logs')).toContain('String.prototype.isWellFormed')
        await notice.getByText('Details', { exact: true }).click()
        await expect(notice.locator('pre')).toBeVisible()
        await expect(notice.locator('pre')).toContainText(userAgent)
        await notice.screenshot({
          animations: 'disabled',
          path: testInfo.outputPath(`${name}-${theme}.png`)
        })
        const layout = await notice.evaluate((element) => ({
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          background: getComputedStyle(element).backgroundColor,
          links: Array.from(element.querySelectorAll('a'), (link) => ({
            left: link.getBoundingClientRect().left - element.getBoundingClientRect().left,
            right: link.getBoundingClientRect().right - element.getBoundingClientRect().left
          }))
        }))
        await testInfo.attach('notice-layout', {
          body: JSON.stringify(layout),
          contentType: 'application/json'
        })
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
        for (const link of layout.links) {
          expect(link.left).toBeGreaterThanOrEqual(0)
          expect(link.right).toBeLessThanOrEqual(layout.width)
        }
        if (name === 'supported-version') {
          for (const link of [requirements, report]) {
            const opening = page.waitForEvent('popup')
            await link.focus()
            await page.keyboard.press('Enter')
            const popup = await opening
            try {
              await expect(popup).toHaveURL((await link.getAttribute('href')) ?? '')
            } finally {
              await popup.close()
            }
            await expect(notice).toBeVisible()
          }
          expect(requests).toHaveLength(2)
        } else expect(requests).toEqual([])
        expect(errors).toEqual([])
      })
    }
  })
}
