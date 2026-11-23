import { expect, test } from '@playwright/test'

import type { SupportEnvironment } from '@/app/shell/support/detect'
import type * as SupportGuidance from '@/app/shell/support/guidance'
import type * as SupportRenderer from '@/app/shell/support/render'

const PLATFORMS = [
  {
    name: 'mac-old',
    os: 'macos',
    osVersion: '12.6.4',
    browser: 'safari',
    browserVersion: 16.2,
    webviewVersion: '615.1'
  },
  {
    name: 'mac-update',
    os: 'macos',
    osVersion: '13.7.8',
    browser: 'safari',
    browserVersion: 16.2,
    webviewVersion: '615.1'
  },
  { name: 'mac-version-unknown', os: 'macos', browser: 'safari', browserVersion: 16.2 },
  { name: 'linux', os: 'linux', osVersion: '6.1.0', browser: 'safari', webviewVersion: '2.38.6' },
  {
    name: 'windows',
    os: 'windows',
    osVersion: '10.0.19045',
    browser: 'edge',
    browserVersion: 100,
    webviewVersion: '100.0.1185'
  },
  { name: 'unknown', os: 'unknown', browser: 'unknown', webviewVersion: '0.1' }
] as const

for (const platform of PLATFORMS) {
  for (const theme of ['dark', 'light'] as const) {
    test(`${platform.name} support disclosure and link intent in ${theme}`, async ({
      page,
      context
    }, testInfo) => {
      const requests: string[] = []
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await context.route(
        (url) =>
          (url.origin === 'https://github.com' &&
            url.pathname.startsWith('/jpoindexter/brutal-editor/')) ||
          (url.origin === 'https://developer.microsoft.com' &&
            url.pathname === '/microsoft-edge/webview2/'),
        async (route) => {
          requests.push(route.request().url())
          await route.fulfill({
            contentType: 'text/html',
            body: '<title>Test-owned support destination</title>'
          })
        }
      )
      await page.emulateMedia({ colorScheme: theme })
      await page.addInitScript(() => Reflect.deleteProperty(String.prototype, 'isWellFormed'))
      await page.goto('/')
      await expect(page.getByRole('alert')).toBeVisible()
      const environment: SupportEnvironment = {
        ...platform,
        host: 'desktop',
        userAgent: `Brutal test-owned ${platform.name} environment`
      }
      await page.evaluate(async (environment) => {
        const guidancePath = '/src/app/shell/support/guidance.ts'
        const renderPath = '/src/app/shell/support/render.ts'
        const guidance: typeof SupportGuidance = await import(guidancePath)
        const renderer: typeof SupportRenderer = await import(renderPath)
        renderer.renderSupportNotice(
          guidance.unsupportedNotice(environment, ['String.prototype.isWellFormed'])
        )
      }, environment)
      const notice = page.getByRole('alert')
      await expect(notice.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('canvas')).toHaveCount(0)
      await expect
        .poll(() =>
          notice
            .locator('img')
            .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0)
        )
        .toBe(true)
      const disclosure = notice.locator('summary')
      await disclosure.focus()
      await expect(disclosure).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(notice.locator('pre')).toBeVisible()
      await expect(notice.locator('pre')).toContainText(environment.userAgent)
      for (const value of [environment.osVersion, environment.webviewVersion]) {
        if (value) await expect(notice.locator('pre')).toContainText(value)
      }
      await notice.screenshot({
        animations: 'disabled',
        path: testInfo.outputPath(`${platform.name}-${theme}.png`)
      })
      const layout = await notice.evaluate((element) => ({
        text: element.textContent,
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        background: getComputedStyle(element).backgroundColor,
        links: Array.from(element.querySelectorAll('a'), (link) => ({
          href: link.href,
          text: link.textContent
        }))
      }))
      await testInfo.attach('notice-output', {
        body: JSON.stringify({ environment, layout }),
        contentType: 'application/json'
      })
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
      const links = notice.getByRole('link')
      expect(await links.count()).toBe(platform.name === 'windows' ? 3 : 2)
      for (const link of await links.all()) {
        const href = await link.getAttribute('href')
        const opening = page.waitForEvent('popup')
        await link.focus()
        await page.keyboard.press('Enter')
        const popup = await opening
        try {
          await expect(popup).toHaveURL(href ?? '')
        } finally {
          await popup.close()
        }
        await expect(notice).toBeVisible()
      }
      expect(requests).toHaveLength(platform.name === 'windows' ? 3 : 2)
      await disclosure.focus()
      await page.keyboard.press('Enter')
      await expect(notice.locator('pre')).toBeHidden()
      expect(errors).toEqual([])
    })
  }
}
