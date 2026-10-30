import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('Space Around redistributes on resize, supports clean Undo, saves and reopens, and exports matching HTML', async ({
  page,
  context
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({
    name: 'spacing.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'row',
            type: 'frame',
            name: 'Spacing row',
            width: 300,
            height: 100,
            layout: 'horizontal',
            children: ['a', 'b', 'c'].map((id) => ({
              id,
              name: id,
              type: 'rectangle',
              width: 30,
              height: 30,
              fill: '#ff0000'
            }))
          }
        ]
      })
    )
  })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Spacing row' }).first().click()
  const inspector = page.getByTestId('properties-panel')
  const alignment = inspector.getByRole('toolbar', { name: 'Alignment', exact: true })
  await expect(alignment.getByRole('button', { name: 'Align left', exact: true })).toBeDisabled()
  const around = inspector.getByRole('radio', { name: 'Space Around', exact: true })
  const positions = () =>
    page.evaluate(() =>
      ['a', 'b', 'c'].map((id) => window.openPencil?.getStore?.().graph.getNode(id)?.x)
    )
  await around.check()
  const fixedGap = inspector.getByRole('spinbutton', { name: 'Fixed gap amount', exact: true })
  await expect(fixedGap).toHaveAttribute('aria-disabled', 'true')
  await fixedGap.dblclick({ force: true })
  await expect(fixedGap.locator('input')).toHaveCount(0)
  await expect(
    inspector.getByTestId('layout-alignment-grid').getByRole('button', { pressed: true })
  ).toHaveCount(3)
  await expect.poll(positions).toEqual([35, 135, 235])
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  await width.dblclick()
  await width.fill('600')
  await width.press('Enter')
  await expect.poll(positions).toEqual([85, 285, 485])
  await canvas.undo()
  await expect.poll(positions).toEqual([35, 135, 235])
  await expect(around).toBeChecked()
  await canvas.undo()
  await expect.poll(positions).toEqual([0, 30, 60])
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await inspector.getByRole('radio', { name: 'Space Between', exact: true }).check()
  await expect.poll(positions).toEqual([0, 135, 270])
  await around.check()
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await download
  const bytes = await readFile(await saved.path())
  expect(parsePenDocument(bytes.toString()).children[0]).toMatchObject({
    justifyContent: 'space_around',
    gap: 0,
    padding: 0
  })
  const reopen = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await reopen
  ).setFiles({ name: 'spacing-reopened.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page.getByTestId('layers-item').filter({ hasText: 'Spacing row' }).first().click()
  await expect(around).toBeChecked()
  await expect.poll(positions).toEqual([35, 135, 235])
  const htmlDownload = page.waitForEvent('download')
  await inspector.getByRole('button', { name: 'Export HTML', exact: true }).click()
  const html = await htmlDownload
  const rendered = await context.newPage()
  await rendered.setContent((await readFile(await html.path())).toString())
  const root = rendered.locator('[data-layer-name="Spacing row"]')
  const origin = await root.boundingBox()
  const lefts = await Promise.all(
    ['a', 'b', 'c'].map(async (name) => {
      const box = await rendered.locator(`[data-layer-name="${name}"]`).boundingBox()
      return box && origin ? Math.round(box.x - origin.x) : null
    })
  )
  expect(lefts).toEqual([35, 135, 235])
  await page.evaluate(() => window.openPencil?.getStore?.().select(['a']))
  const absolute = inspector.getByRole('checkbox', { name: 'Absolute Position', exact: true })
  const alignRight = alignment.getByRole('button', { name: 'Align right', exact: true })
  await expect(alignRight).toBeDisabled()
  await absolute.check()
  await expect(alignRight).toBeEnabled()
  await alignRight.click()
  await expect.poll(positions).toEqual([270, 60, 210])
  await canvas.undo()
  await expect.poll(positions).toEqual([35, 60, 210])
  await expect(absolute).toBeChecked()
  await canvas.undo()
  await expect(absolute).not.toBeChecked()
  await expect.poll(positions).toEqual([35, 135, 235])
  canvas.assertNoErrors()
})
