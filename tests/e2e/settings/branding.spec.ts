import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

const LOCALES = [
  { locale: 'en', welcome: 'Welcome to Brutal', privacyHeading: 'Anonymous usage sharing' },
  {
    locale: 'de',
    welcome: 'Willkommen bei Brutal',
    privacyHeading: 'Anonyme Nutzungsdaten teilen'
  },
  {
    locale: 'es',
    welcome: 'Te damos la bienvenida a Brutal',
    privacyHeading: 'Compartir uso anónimo'
  },
  {
    locale: 'fr',
    welcome: 'Bienvenue dans Brutal',
    privacyHeading: 'Partage anonyme des usages'
  },
  {
    locale: 'it',
    welcome: 'Benvenuto in Brutal',
    privacyHeading: 'Condivisione anonima dell’utilizzo'
  },
  { locale: 'ja', welcome: 'Brutal へようこそ', privacyHeading: '匿名の使用状況の共有' },
  { locale: 'pl', welcome: 'Witamy w Brutal', privacyHeading: 'Anonimowe udostępnianie użycia' },
  {
    locale: 'ru',
    welcome: 'Добро пожаловать в Brutal',
    privacyHeading: 'Анонимная статистика использования'
  },
  { locale: 'zh-CN', welcome: '欢迎使用 Brutal', privacyHeading: '匿名使用情况共享' }
]

for (const { locale, welcome, privacyHeading } of LOCALES) {
  test.describe(locale, () => {
    test.use({
      storageState: async ({ baseURL }, use) => {
        if (!baseURL) throw new Error('Browser test baseURL is required')
        await use({
          cookies: [],
          origins: [
            {
              origin: new URL(baseURL).origin,
              localStorage: [{ name: 'open-pencil-locale', value: locale }]
            }
          ]
        })
      }
    })
    test(`Brutal welcome and privacy explain the app and upstream recipient in ${locale}`, async ({
      page
    }, testInfo) => {
      const reports: string[] = []
      await page.route('https://feedback.openpencil.dev/**', async (route) => {
        reports.push(route.request().url())
        await route.abort()
      })
      await page.goto('/')
      await new CanvasHelper(page).waitForInit()
      const setup = page.getByTestId('ai-setup-dialog')
      await expect(setup.getByRole('heading').first()).toHaveText(welcome)
      await expect(setup).not.toContainText('OpenPencil')
      await setup.screenshot({ path: testInfo.outputPath('welcome.png') })
      await page.keyboard.press('Escape')
      await expect(setup).toHaveCount(0)

      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
      await page.getByTestId('settings-section-privacy').click()
      const privacy = page.getByTestId('settings-privacy-panel')
      await expect(privacy).toBeVisible()
      await expect(privacy).toContainText('OpenPencil')
      await expect(privacy.getByRole('heading').first()).not.toContainText('OpenPencil')
      await expect(privacy.getByRole('status')).toBeVisible()
      await expect(privacy.getByRole('heading').first()).toHaveText(privacyHeading)
      const switches = privacy.getByRole('switch')
      await expect(switches).toHaveCount(2)
      for (const toggle of await switches.all()) await toggle.click()
      await page.reload()
      await new CanvasHelper(page).waitForInit()
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
      await page.getByTestId('settings-section-privacy').click()
      await expect(privacy).toBeVisible()
      await expect(privacy.getByRole('switch').nth(1)).toBeChecked()
      await expect(privacy.getByRole('heading').first()).toHaveText(privacyHeading)
      expect(await privacy.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true
      )
      await privacy.screenshot({ path: testInfo.outputPath('privacy.png') })
      await page.getByTestId('settings-section-diagnostics').click()
      const diagnostics = page.getByTestId('settings-diagnostics-panel')
      await expect(diagnostics).toContainText('Brutal')
      await expect(diagnostics).not.toContainText('OpenPencil')
      await diagnostics.screenshot({ path: testInfo.outputPath('diagnostics.png') })
      await page.getByTestId('settings-section-editor').click()
      const editor = page.getByTestId('settings-editor-panel')
      await expect(editor).toContainText('Brutal')
      await expect(editor).not.toContainText('OpenPencil')
      const rendering = editor.locator('section').filter({
        has: page.getByTestId('settings-progressive-tiled-rendering')
      })
      await rendering.scrollIntoViewIfNeeded()
      await expect(rendering.getByText(/Brutal/)).toBeVisible()
      await rendering.screenshot({ path: testInfo.outputPath('rendering.png') })
      expect(reports).toEqual([])
    })
  })
}
