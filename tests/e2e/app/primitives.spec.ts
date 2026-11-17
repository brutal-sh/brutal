import { expect, test, type Page } from '@playwright/test'

import { exportFigFile } from '@open-pencil/core/io/formats/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { getPageChildren } from '#tests/helpers/store'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

const selectedNames = (page: Page) =>
  page.evaluate(() =>
    window.openPencil
      ?.getStore?.()
      .getSelectedNodes()
      .map((node) => node.name)
  )

test.beforeEach(async ({ page }) => {
  await mockOfficialCloudDiscovery(page)
})

test('Primitives Icon arms placement without opening the glyph picker', async ({
  page
}, testInfo) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await expect(page.getByRole('button', { name: 'Insert icon', exact: true })).toHaveCount(0)
  const trigger = page.getByRole('button', { name: 'Primitives', exact: true })
  await trigger.click()
  await expect(page.getByRole('menu', { name: 'Primitives', exact: true })).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('primitives-menu.png'),
    animations: 'disabled'
  })
  await page.getByRole('menuitemradio', { name: 'Icon', exact: true }).click()
  await expect(page.getByTestId(toolbarToolTestId('ICON'))).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog', { name: 'Insert icon', exact: true })).toBeHidden()
  expect(await getPageChildren(page)).toHaveLength(0)
  await canvas.pressKey('Escape')
  await expect(page.getByTestId(toolbarToolTestId('SELECT'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(await getPageChildren(page)).toHaveLength(0)
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
