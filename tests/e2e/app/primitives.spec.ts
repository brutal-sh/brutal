import { expect, test, type Page } from '@playwright/test'

import { exportFigFile } from '@open-pencil/core/io/formats/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

import { CanvasHelper } from '#tests/helpers/canvas'

const selectedNames = (page: Page) =>
  page.evaluate(() =>
    window.openPencil
      ?.getStore?.()
      .getSelectedNodes()
      .map((node) => node.name)
  )

test('Primitives opens the icon picker even when its standalone toolbar button is hidden', async ({
  page
}, testInfo) => {
  await page.route('https://api.iconify.design/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const set = {
      prefix: 'test',
      width: 24,
      height: 24,
      icons: { 'parity-test-square': { body: '<path fill="currentColor" d="M2 2h20v20H2z"/>' } }
    }
    if (path === '/search') {
      await route.fulfill({
        json: {
          icons: ['test:parity-test-square'],
          total: 1,
          collections: { test: { name: 'Test Icons', total: 1 } }
        }
      })
    } else if (path === '/collections') {
      await route.fulfill({
        json: { test: { name: 'Test Icons', total: 1, license: { title: 'MIT' } } }
      })
    } else await route.fulfill({ json: set })
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await expect(page.getByRole('button', { name: 'Insert icon', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Primitives', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('primitives-menu.png') })
  await page.getByRole('menuitem', { name: 'Icon', exact: true }).click()
  const picker = page.getByRole('dialog', { name: 'Insert icon', exact: true })
  await expect(picker).toBeVisible()
  await picker.getByRole('textbox').fill('parity-test-square')
  await picker.getByRole('option', { name: 'parity-test-square', exact: true }).click()
  await expect(picker).toBeHidden()
  await expect.poll(() => selectedNames(page)).toEqual(['parity-test-square'])
  await canvas.undo()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.openPencil
            ?.getStore?.()
            .graph.getChildren(window.openPencil.getStore().state.currentPageId).length
      )
    )
    .toBe(0)
  canvas.assertNoErrors()
})

test('Primitives image and Figma imports insert editable layers and preserve Undo', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const source = new SceneGraph()
  source.createNode('RECTANGLE', source.getPages()[0].id, {
    name: 'Imported Figma layer',
    width: 40,
    height: 20
  })
  const fig = Buffer.from(await exportFigFile(source))
  const inputs = [
    {
      action: 'Import Image or SVG…',
      name: 'mark.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg width="40" height="20"><rect width="40" height="20" fill="red"/></svg>'
      ),
      layer: 'mark',
      accept: 'image/svg+xml'
    },
    {
      action: 'Import Figma',
      name: 'import.fig',
      mimeType: 'application/octet-stream',
      buffer: fig,
      layer: 'Imported Figma layer',
      accept: '.fig'
    }
  ]
  for (const input of inputs) {
    await page.getByRole('button', { name: 'Primitives', exact: true }).click()
    const choosing = page.waitForEvent('filechooser')
    await page.getByRole('menuitem', { name: input.action, exact: true }).click()
    const chooser = await choosing
    expect(await chooser.element().getAttribute('accept')).toContain(input.accept)
    await chooser.setFiles({ name: input.name, mimeType: input.mimeType, buffer: input.buffer })
    await expect.poll(() => selectedNames(page)).toEqual([input.layer])
    await canvas.undo()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.openPencil
              ?.getStore?.()
              .graph.getChildren(window.openPencil.getStore().state.currentPageId).length
        )
      )
      .toBe(0)
  }
  canvas.assertNoErrors()
})
