import { expect, test } from '@playwright/test'

import type * as FontModule from '@open-pencil/core/text'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'
import { trackFontModuleResources } from '#tests/helpers/fonts/runtime'

const LOCALES = [
  {
    locale: 'en',
    description: 'Installed, but in a format Brutal can’t draw yet'
  },
  {
    locale: 'de',
    description: 'Installiert, aber in einem Format, das Brutal noch nicht darstellen kann'
  },
  {
    locale: 'es',
    description: 'Instalada, pero en un formato que Brutal aún no puede dibujar'
  },
  {
    locale: 'fr',
    description: 'Installée, mais dans un format qu’Brutal ne peut pas encore afficher'
  },
  {
    locale: 'it',
    description: 'Installato, ma in un formato che Brutal non può ancora disegnare'
  },
  {
    locale: 'ja',
    description: 'インストール済みですが、Brutal がまだ描画できない形式です'
  },
  {
    locale: 'pl',
    description: 'Zainstalowany, ale w formacie, którego Brutal jeszcze nie obsługuje'
  },
  {
    locale: 'ru',
    description: 'Установлен, но в формате, который Brutal пока не умеет отображать'
  },
  {
    locale: 'zh-CN',
    description: '已安装，但 Brutal 暂时无法绘制这种字体格式'
  }
] as const

for (const { locale, description } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    test(`unsupported font guidance identifies Brutal in ${locale}`, async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'queryLocalFonts', {
          configurable: true,
          value: async () => []
        })
      })
      const interceptedURLs = await mockEditorCopyServices(page)
      await trackFontModuleResources(page)
      await page.goto('/?test')
      const canvas = new CanvasHelper(page)
      await canvas.waitForInit()

      const nodeId = await page.evaluate(async () => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor is unavailable')
        const fontModuleURL = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .find((url) => url.includes('/packages/core/src/text/fonts.ts'))
        if (!fontModuleURL) throw new Error('Active font module is unavailable')
        const { fontManager, UnsupportedFontFormatError } = (await import(
          /* @vite-ignore */ fontModuleURL
        )) as Pick<typeof FontModule, 'fontManager' | 'UnsupportedFontFormatError'>
        const family = 'Brand Unsupported Sans'
        fontManager.setOnlineFontProviders({})
        fontManager.setHostFontCatalog([{ family, styles: ['Regular'] }])
        fontManager.setHostFontLoader(async (requestedFamily, style) => {
          if (requestedFamily === family) throw new UnsupportedFontFormatError(family, style)
          return null
        })
        const id = store.createShape('TEXT', 120, 120, 300, 48)
        store.updateNode(id, { text: 'Font status preview', fontFamily: family })
        store.select([id])
        return id
      })

      const banner = page.getByTestId('font-status-banner')
      await expect(banner).toBeVisible()
      await page.getByTestId('font-status-toggle').click()
      const issue = page
        .getByTestId('font-status-issue')
        .filter({ hasText: 'Brand Unsupported Sans' })
      await expect(issue).toBeVisible()
      await issue.locator('[data-tooltip-trigger] > span').hover()
      const tip = page.getByRole('tooltip').filter({ hasText: description })
      await expect(tip).toHaveText(description)
      expect(await tip.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath('unsupported-font.png') })
      expect(
        await page.evaluate((id) => {
          const node = window.openPencil?.getStore?.().graph.getNode(id)
          return node ? { family: node.fontFamily, text: node.text } : null
        }, nodeId)
      ).toEqual({ family: 'Brand Unsupported Sans', text: 'Font status preview' })
      await testInfo.attach('intercepted-network', {
        body: JSON.stringify(interceptedURLs),
        contentType: 'application/json'
      })
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })
  })
}
