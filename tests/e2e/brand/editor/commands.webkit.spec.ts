import { expect, test } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

const LOCALES = [
  { locale: 'en', description: 'Search and run Brutal commands.' },
  { locale: 'de', description: 'Brutal-Befehle suchen und ausführen.' },
  { locale: 'es', description: 'Busca y ejecuta comandos de Brutal.' },
  { locale: 'fr', description: 'Rechercher et exécuter des commandes Brutal.' },
  { locale: 'it', description: 'Cerca ed esegui i comandi di Brutal.' },
  { locale: 'ja', description: 'Brutal のコマンドを検索して実行します。' },
  { locale: 'pl', description: 'Wyszukuj i uruchamiaj polecenia Brutal.' },
  { locale: 'ru', description: 'Поиск и выполнение команд Brutal.' },
  { locale: 'zh-CN', description: '搜索并运行 Brutal 命令。' }
] as const

for (const { locale, description } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    test(`command search identifies Brutal in ${locale}`, async ({ page }, testInfo) => {
      const interceptedURLs = await mockEditorCopyServices(page)
      await page.goto('/?test')
      const canvas = new CanvasHelper(page)
      await canvas.waitForInit()

      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k')
      const palette = page.getByRole('dialog').filter({ has: page.getByRole('searchbox') })
      await expect(palette).toBeVisible()
      await expect(palette).toHaveAccessibleDescription(description)
      await expect(palette.getByRole('searchbox')).toBeFocused()
      expect(await palette.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true
      )
      await palette.screenshot({ path: testInfo.outputPath('command-search.png') })
      await page.keyboard.press('Escape')
      await expect(palette).toBeHidden()
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })
  })
}
