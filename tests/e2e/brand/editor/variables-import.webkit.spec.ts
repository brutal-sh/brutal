import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { exportFigFile, parseFigFile } from '@open-pencil/core/io/formats/fig'
import { SceneGraph, type VariableUnsupportedExpression } from '@open-pencil/scene-graph'

import type * as AppTheme from '@/app/shell/theme'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'

const DEFINITION: VariableUnsupportedExpression = {
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

async function fixtureBytes() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('Fixture has no page')
  const collection = graph.createCollection('Brand tokens')
  const variable = graph.createVariable('Brand width', 'FLOAT', collection.id, DEFINITION)
  graph.createNode('FRAME', page.id, {
    name: 'Brand variable consumer',
    width: 80,
    height: 20,
    boundVariables: { width: variable.id }
  })
  return Buffer.from(await exportFigFile(graph, { documentName: 'Brand variable fixture' }))
}

const LOCALES = [
  {
    locale: 'en',
    description:
      'Brutal can’t evaluate these variables yet, so layers keep the values saved in the file: Brand width.'
  },
  {
    locale: 'de',
    description:
      'Brutal kann diese Variablen noch nicht auswerten, daher behalten Ebenen die in der Datei gespeicherten Werte: Brand width.'
  },
  {
    locale: 'es',
    description:
      'Brutal aún no puede evaluar estas variables, así que las capas conservan los valores guardados en el archivo: Brand width.'
  },
  {
    locale: 'fr',
    description:
      'Brutal ne sait pas encore évaluer ces variables ; les calques gardent les valeurs enregistrées dans le fichier : Brand width.'
  },
  {
    locale: 'it',
    description:
      'Brutal non sa ancora valutare queste variabili, quindi i livelli mantengono i valori salvati nel file: Brand width.'
  },
  {
    locale: 'ja',
    description:
      'Brutal はまだこれらの変数を評価できないため、レイヤーはファイルに保存された値を保ちます: Brand width'
  },
  {
    locale: 'pl',
    description:
      'Brutal nie potrafi jeszcze obliczyć tych zmiennych, więc warstwy zachowują wartości zapisane w pliku: Brand width.'
  },
  {
    locale: 'ru',
    description:
      'Brutal пока не умеет вычислять эти переменные, поэтому слои сохраняют значения из файла: Brand width.'
  },
  {
    locale: 'zh-CN',
    description: 'Brutal 暂不能计算这些变量，图层保留文件中保存的值：Brand width'
  }
] as const

for (const { locale, description } of LOCALES) {
  for (const colorScheme of ['dark', 'light'] as const) {
    test.describe(`${locale} ${colorScheme}`, () => {
      test.use({ locale, colorScheme })
      test(`imported variable guidance survives FIG save and reopen in ${locale}`, async ({
        page
      }, testInfo) => {
        await page.addInitScript(() => {
          window.showOpenFilePicker = undefined
          window.showSaveFilePicker = undefined
        })
        const interceptedURLs = await mockEditorCopyServices(page)
        const canvas = new CanvasHelper(page)
        await page.goto('/?test')
        await canvas.waitForInit()
        await page.evaluate(async (appearance) => {
          const themeURL = '/src/app/shell/theme.ts'
          const theme: typeof AppTheme = await import(themeURL)
          theme.setAppTheme(appearance)
        }, colorScheme)
        await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)
        const chooser = page.waitForEvent('filechooser')
        await page.keyboard.press('ControlOrMeta+o')
        await (
          await chooser
        ).setFiles({
          name: 'brand-variable.fig',
          mimeType: 'application/octet-stream',
          buffer: await fixtureBytes()
        })
        const warning = page
          .locator('[data-slot="toast"][data-tone="warning"]')
          .filter({ hasText: description })
        await expect(warning).toContainText(description)
        expect(
          await warning.evaluate((element) => element.scrollWidth <= element.clientWidth)
        ).toBe(true)
        await canvas.waitForInit()
        await page.screenshot({
          animations: 'disabled',
          path: testInfo.outputPath('imported-variable-warning.png')
        })
        await testInfo.attach('warning-surface-colors', {
          body: JSON.stringify(
            await warning.evaluate((element) => {
              const style = getComputedStyle(element)
              return {
                theme: document.documentElement.dataset.theme,
                opacity: style.opacity,
                color: style.color,
                background: style.backgroundColor,
                panel: style.getPropertyValue('--color-panel').trim(),
                bounds: element.getBoundingClientRect().toJSON()
              }
            })
          ),
          contentType: 'application/json'
        })
        await warning.locator('[data-slot="toast-close"]').click()
        await expect(warning).toBeHidden()
        const before = await page.evaluate(() => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          const variable = [...store.graph.variables.values()].find(
            (value) => value.name === 'Brand width'
          )
          const node = [...store.graph.getAllNodes()].find(
            (value) => value.name === 'Brand variable consumer'
          )
          if (!variable || !node) throw new Error('Fixture is unavailable')
          const definition =
            variable.valuesByMode[store.graph.getActiveModeId(variable.collectionId)]
          const width = node.width
          store.updateNode(node.id, { height: 24 })
          store.setPageColor({ r: 24 / 255, g: 24 / 255, b: 27 / 255, a: 1 })
          return { definition, width }
        })
        expect(before).toEqual({ definition: DEFINITION, width: 80 })
        page.once('dialog', (dialog) => dialog.accept('brand-variable-saved.fig'))
        const download = page.waitForEvent('download')
        await page.keyboard.press('ControlOrMeta+Shift+s')
        const saved = await download
        expect(saved.suggestedFilename()).toBe('brand-variable-saved.fig')
        const bytes = await readFile(await saved.path())
        const graph = await parseFigFile(Uint8Array.from(bytes).buffer)
        const variable = [...graph.variables.values()].find((value) => value.name === 'Brand width')
        const node = [...graph.getAllNodes()].find(
          (value) => value.name === 'Brand variable consumer'
        )
        if (!variable || !node) throw new Error('Saved fixture is unavailable')
        expect(variable.valuesByMode[graph.getActiveModeId(variable.collectionId)]).toEqual(
          DEFINITION
        )
        expect({ width: node.width, height: node.height }).toEqual({ width: 80, height: 24 })
        const reopen = page.waitForEvent('filechooser')
        await page.keyboard.press('ControlOrMeta+o')
        await (
          await reopen
        ).setFiles({
          name: 'brand-variable-reopened.fig',
          mimeType: 'application/octet-stream',
          buffer: bytes
        })
        await expect(page.getByRole('tab', { name: /brand-variable-reopened/ })).toHaveAttribute(
          'aria-selected',
          'true'
        )
        await canvas.waitForInit()
        await expect(warning).toContainText(description)
        await expect
          .poll(() =>
            page.evaluate(() => {
              const store = window.openPencil?.getStore?.()
              if (!store) throw new Error('Editor unavailable')
              const variable = [...store.graph.variables.values()].find(
                (value) => value.name === 'Brand width'
              )
              const node = [...store.graph.getAllNodes()].find(
                (value) => value.name === 'Brand variable consumer'
              )
              return {
                definition:
                  variable?.valuesByMode[store.graph.getActiveModeId(variable.collectionId)],
                width: node?.width,
                height: node?.height
              }
            })
          )
          .toEqual({ definition: DEFINITION, width: 80, height: 24 })
        await canvas.waitForRender()
        await page.screenshot({
          animations: 'disabled',
          path: testInfo.outputPath('reopened-variable-warning-dark-canvas.png')
        })
        expect(interceptedURLs).toEqual([])
        canvas.assertNoErrors()
      })
    })
  }
}
