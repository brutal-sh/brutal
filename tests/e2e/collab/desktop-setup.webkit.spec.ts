import { expect, test, type Locator } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'
import { relayURLFor, roomLinkPath, startRelay } from '#tests/helpers/collab/room'
import { getSelectedNode } from '#tests/helpers/store'

const SETUP_URL = 'https://open-pen.vercel.app/help/getting-started/'
const LOCALES = [
  { locale: 'en', label: 'Desktop setup' },
  { locale: 'de', label: 'Desktop-Einrichtung' },
  { locale: 'es', label: 'Configurar la aplicación de escritorio' },
  { locale: 'fr', label: 'Configurer l’application de bureau' },
  { locale: 'it', label: 'Configura l’app desktop' },
  { locale: 'ja', label: 'デスクトップ版のセットアップ' },
  { locale: 'pl', label: 'Konfiguracja aplikacji komputerowej' },
  { locale: 'ru', label: 'Настройка настольного приложения' },
  { locale: 'zh-CN', label: '桌面版设置' }
] as const

for (const { locale, label } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    for (const mode of ['waiting', 'sharing'] as const) {
      test(`${mode} reaches the fork’s desktop setup in ${locale}`, async ({
        page,
        context
      }, testInfo) => {
        const relay = await startRelay()
        try {
          const interceptedURLs = await mockEditorCopyServices(page)
          await context.route(SETUP_URL, (route) =>
            route.fulfill({
              contentType: 'text/html',
              body: '<title>Open Pen desktop setup</title>'
            })
          )
          const canvas = new CanvasHelper(page)
          let surface: Locator
          if (mode === 'waiting') {
            await page.goto(relayURLFor(roomLinkPath(), relay.url))
            surface = page.getByTestId('room-screen')
            await expect(surface).toHaveAttribute('data-status', 'waiting')
          } else {
            await page.goto(relayURLFor('/', relay.url))
            await canvas.waitForInit()
            await canvas.drawRect(350, 300, 160, 100)
            await page.getByTestId('collab-share-button').click()
            await page.getByTestId('collab-share-file').click()
            await page.getByTestId('collab-share-button').click()
            surface = page.getByTestId('collab-popover')
            await expect(surface.getByTestId('collab-room-link')).toBeVisible()
          }
          const before = mode === 'sharing' ? await getSelectedNode(page) : undefined
          const link = surface.getByRole('link', { name: label, exact: true })
          await expect(link).toHaveAttribute('href', SETUP_URL)
          await surface.screenshot({
            animations: 'disabled',
            path: testInfo.outputPath(`desktop-setup-${mode}.png`)
          })
          const layout = await surface.evaluate((element) => ({
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth
          }))
          await testInfo.attach('desktop-link-layout', {
            body: JSON.stringify(layout),
            contentType: 'application/json'
          })
          expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
          const opening = page.waitForEvent('popup')
          await link.focus()
          await expect(link).toBeFocused()
          await page.keyboard.press(mode === 'sharing' ? 'NumpadEnter' : 'Enter')
          const setup = await opening
          try {
            await expect(setup).toHaveURL(SETUP_URL)
          } finally {
            await setup.close()
          }
          if (mode === 'waiting') {
            await expect(surface).toHaveAttribute('data-status', 'waiting')
            await page.getByTestId('room-screen-leave').click()
            await expect(surface).toHaveCount(0)
          } else {
            expect(await getSelectedNode(page)).toEqual(before)
            await page.keyboard.press('Escape')
            await page.getByTestId('collab-share-button').click()
            await surface.getByTestId('collab-leave').click()
            await expect(surface).toHaveCount(0)
            expect(await getSelectedNode(page)).toEqual(before)
          }
          expect(interceptedURLs).toEqual([])
          canvas.assertNoErrors()
        } finally {
          await relay.close()
        }
      })
    }
  })
}
