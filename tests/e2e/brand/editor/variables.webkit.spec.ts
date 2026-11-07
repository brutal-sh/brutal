import { expect, test } from '@playwright/test'

import type { VariableUnsupportedExpression } from '@open-pencil/scene-graph'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

const LOCALES = [
  {
    locale: 'en',
    description: 'Open Pen can’t evaluate KEYFRAME yet. Saving keeps it as it is.'
  },
  {
    locale: 'de',
    description:
      'Open Pen kann KEYFRAME noch nicht auswerten. Beim Speichern bleibt es unverändert.'
  },
  {
    locale: 'es',
    description: 'Open Pen aún no puede evaluar KEYFRAME. Al guardar se conserva tal cual.'
  },
  {
    locale: 'fr',
    description:
      'Open Pen ne sait pas encore évaluer KEYFRAME. L’enregistrement le conserve tel quel.'
  },
  {
    locale: 'it',
    description: 'Open Pen non sa ancora valutare KEYFRAME. Il salvataggio lo mantiene invariato.'
  },
  {
    locale: 'ja',
    description: 'Open Pen はまだ KEYFRAME を評価できません。保存してもそのまま残ります。'
  },
  {
    locale: 'pl',
    description: 'Open Pen nie potrafi jeszcze obliczyć KEYFRAME. Zapis zachowuje je bez zmian.'
  },
  {
    locale: 'ru',
    description: 'Open Pen пока не умеет вычислять KEYFRAME. При сохранении оно остаётся как есть.'
  },
  {
    locale: 'zh-CN',
    description: 'Open Pen 暂不能计算 KEYFRAME。保存时会原样保留。'
  }
] as const

for (const { locale, description } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    test(`unsupported variable guidance preserves the expression in ${locale}`, async ({
      page
    }, testInfo) => {
      const interceptedURLs = await mockEditorCopyServices(page)
      await page.goto('/?test')
      const canvas = new CanvasHelper(page)
      await canvas.waitForInit()
      const ids = await page.evaluate(() => {
        const editor = window.openPencil?.getStore?.()
        if (!editor) throw new Error('Editor is unavailable')
        const collection = editor.graph.createCollection('Brand tokens')
        const definition: VariableUnsupportedExpression = {
          expression: 'UNSUPPORTED',
          function: 'KEYFRAME',
          value: {
            dataType: 'EXPRESSION',
            resolvedDataType: 'FLOAT',
            value: { expressionValue: { expressionFunction: 'KEYFRAME', expressionArguments: [] } }
          },
          references: [],
          modes: []
        }
        const variable = editor.graph.createVariable(
          'Brand width',
          'FLOAT',
          collection.id,
          definition
        )
        const node = editor.graph.createNode('FRAME', editor.state.currentPageId, {
          name: 'Brand variable consumer',
          x: 100,
          y: 100,
          width: 80,
          height: 20,
          boundVariables: { width: variable.id }
        })
        editor.requestRender()
        return { variable: variable.id, node: node.id, mode: collection.defaultModeId, definition }
      })
      await page
        .getByRole('toolbar')
        .getByRole('button', { name: 'Variables', exact: true })
        .click()
      const dialog = page.getByTestId('variables-dialog')
      await dialog.locator(`[data-variable-id="${ids.variable}"]`).click()
      const inspector = dialog.getByTestId('token-inspector')
      await inspector.getByText('KEYFRAME(…)', { exact: true }).hover()
      const tip = page.getByRole('tooltip').filter({ hasText: description })
      await expect(tip).toHaveText(description)
      expect(await tip.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath('unsupported-variable.png') })
      expect(
        await page.evaluate(({ variable, node, mode }) => {
          const graph = window.openPencil?.getStore?.().graph
          return {
            width: graph?.getNode(node)?.width,
            definition: graph?.variables.get(variable)?.valuesByMode[mode]
          }
        }, ids)
      ).toEqual({ width: 80, definition: ids.definition })
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
    })
  })
}
