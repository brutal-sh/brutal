import { readFile } from 'node:fs/promises'

import { expect, test, type Locator, type TestInfo } from '@playwright/test'
import * as v from 'valibot'

import {
  AVAILABLE_LOCALES,
  LOCALE_DIR_NAMES,
  messageDefaults,
  type Locale
} from '@open-pencil/vue/i18n'

import { THEME_STORAGE_KEY } from '@/app/settings/theme'

import { mockPortalCopyServices } from '#tests/helpers/brand/portal-services'
import { repoPath } from '#tests/helpers/paths'

const portalControlsSchema = v.object({
  signIn: v.string(),
  approve: v.string(),
  deny: v.string(),
  accountSettings: v.string(),
  verifiedTitle: v.string(),
  deviceExpiredTitle: v.string(),
  desktopApp: v.string()
})

async function portalControls(locale: Locale) {
  if (locale === 'en') return v.parse(portalControlsSchema, messageDefaults.cloudPortal)
  const text = await readFile(
    repoPath('packages/vue/src/i18n/locales', LOCALE_DIR_NAMES[locale], 'cloud/portal.json'),
    'utf8'
  )
  return v.parse(v.pipe(v.string(), v.parseJson(), portalControlsSchema), text)
}

async function capture(region: Locator, testInfo: TestInfo, name: string) {
  const capturePath = testInfo.outputPath(`${name}.png`)
  await region.screenshot({ animations: 'disabled', path: capturePath })
  const output = await region.evaluate((element) => ({
    text: element.textContent,
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
    theme: document.documentElement.dataset.theme,
    title: document.title,
    footer: document.querySelector('footer')?.textContent
  }))
  await testInfo.attach(name, {
    body: JSON.stringify({ ...output, capturePath }),
    contentType: 'application/json'
  })
  expect(output.scrollWidth).toBeLessThanOrEqual(output.width)
}

for (const locale of AVAILABLE_LOCALES) {
  for (const theme of ['dark', 'light'] as const) {
    test.describe(`${locale}/${theme}`, () => {
      test.use({
        locale,
        colorScheme: theme,
        storageState: async ({ baseURL }, use) => {
          if (!baseURL) throw new Error('Portal fixtures need the canonical app server')
          await use({
            cookies: [],
            origins: [
              {
                origin: baseURL,
                localStorage: [
                  { name: THEME_STORAGE_KEY, value: theme },
                  {
                    name: 'open-pencil:preferences:v1',
                    value: JSON.stringify({ version: 1, onboarding: { aiSetup: 'done' } })
                  }
                ]
              }
            ]
          })
        }
      })
      test('public and account-session client labels', async ({ page, baseURL }, testInfo) => {
        if (!baseURL) throw new Error('Portal fixtures need the canonical app server')
        const words = await portalControls(locale)
        const backend = await mockPortalCopyServices(page, baseURL)
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        const column = page.locator('section[aria-labelledby="portal-heading"]')
        await page.goto('/welcome')
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await expect(page.getByRole('button', { name: words.signIn, exact: true })).toBeVisible()
        await capture(column, testInfo, 'welcome')
        await page.getByRole('button', { name: words.signIn, exact: true }).click()
        await expect(page).toHaveURL(new URL('/auth/sign-in', baseURL).href)
        await expect(page.getByRole('textbox').first()).toBeVisible()
        await expect(page.getByRole('button', { name: words.signIn, exact: true })).toBeVisible()
        await page.goto('/auth/sign-in?redirect=%2Fauth%2Fdevice%3Fuser_code%3DABCD-EFGH')
        await expect(page.getByRole('textbox').first()).toBeVisible()
        await expect(page.getByRole('button', { name: words.signIn, exact: true })).toBeVisible()
        await capture(column, testInfo, 'returns-to-desktop')
        await page.goto('/auth/verified')
        await expect(
          page.getByRole('heading', { name: words.verifiedTitle, exact: true })
        ).toBeVisible()
        await capture(column, testInfo, 'verified-return')
        backend.signedIn = true
        await page.goto('/account/sessions')
        const cell = page.getByRole('cell', { name: words.desktopApp }).first()
        await expect(cell).toBeVisible()
        await capture(cell, testInfo, 'desktop-session')
        await testInfo.attach('backend-requests', {
          body: JSON.stringify(backend),
          contentType: 'application/json'
        })
        expect(backend.unexpected).toEqual([])
        expect(backend.remoteRequests).toEqual([])
        expect(errors).toEqual([])
      })

      test('device approval retry, denial and expired feedback', async ({
        page,
        baseURL
      }, testInfo) => {
        if (!baseURL) throw new Error('Portal fixtures need the canonical app server')
        const words = await portalControls(locale)
        const backend = await mockPortalCopyServices(page, baseURL)
        backend.signedIn = true
        backend.approveFailures = 1
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        const column = page.locator('section[aria-labelledby="portal-heading"]')
        const address = '/auth/device?user_code=abcd-efgh'
        await page.goto(address)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(column).toContainText('ada@studio.example')
        await expect(column).toContainText('ABCD-EFGH')
        await expect(page.getByRole('button', { name: words.approve, exact: true })).toBeVisible()
        await capture(column, testInfo, 'approval-request')
        await page.getByRole('button', { name: words.approve, exact: true }).click()
        await expect(column.getByRole('alert')).toHaveCount(2)
        await capture(column, testInfo, 'approval-rejected')
        await page.getByRole('button', { name: words.approve, exact: true }).click()
        await expect(page.getByRole('button', { name: words.approve, exact: true })).toHaveCount(0)
        await capture(column, testInfo, 'approved-return')
        await page.goto(address)
        await page.getByRole('button', { name: words.deny, exact: true }).click()
        await expect(
          page.getByRole('button', { name: words.accountSettings, exact: true })
        ).toBeVisible()
        await capture(column, testInfo, 'denied')
        backend.expired = true
        await page.goto(address)
        await expect(
          page.getByRole('heading', { name: words.deviceExpiredTitle, exact: true })
        ).toBeVisible()
        await capture(column, testInfo, 'expired')
        expect(backend.decisions).toEqual([
          { decision: 'approve', code: 'ABCD-EFGH' },
          { decision: 'approve', code: 'ABCD-EFGH' },
          { decision: 'deny', code: 'ABCD-EFGH' }
        ])
        await testInfo.attach('backend-requests', {
          body: JSON.stringify(backend),
          contentType: 'application/json'
        })
        expect(backend.unexpected).toEqual([])
        expect(backend.remoteRequests).toEqual([])
        expect(errors).toEqual([])
      })
    })
  }
}
