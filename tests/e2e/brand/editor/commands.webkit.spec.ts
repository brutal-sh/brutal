import { expect, test } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

const LOCALES = [
  { locale: 'en', description: 'Search and run Open Pen commands.' },
  { locale: 'de', description: 'Open Pen-Befehle suchen und ausführen.' },
  { locale: 'es', description: 'Busca y ejecuta comandos de Open Pen.' },
  { locale: 'fr', description: 'Rechercher et exécuter des commandes Open Pen.' },
  { locale: 'it', description: 'Cerca ed esegui i comandi di Open Pen.' },
  { locale: 'ja', description: 'Open Pen のコマンドを検索して実行します。' },
  { locale: 'pl', description: 'Wyszukuj i uruchamiaj polecenia Open Pen.' },
  { locale: 'ru', description: 'Поиск и выполнение команд Open Pen.' },
  { locale: 'zh-CN', description: '搜索并运行 Open Pen 命令。' }
] as const

for (const { locale, description } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    test(`command search identifies Open Pen in ${locale}`, async ({ page }, testInfo) => {
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
