import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'
import { getSelectedNode } from '#tests/helpers/store'

test('fractional dimensions retain displayed values, editing history and saved geometry', async ({
  page
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
    name: 'fractional-size.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'fractional-rect',
            name: 'Fractional inspector probe',
            type: 'rectangle',
            x: 12.5,
            y: 16.25,
            width: 120.5,
            height: 80.75,
            cornerRadius: 3.5,
            fill: '#7799BB'
          }
        ]
      })
    )
  })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  const select = () =>
    page.getByTestId('layers-item').filter({ hasText: 'Fractional inspector probe' }).click()
  await select()
  const inspector = page.getByTestId('properties-panel')
  const width = inspector.getByRole('spinbutton', { name: 'Width', exact: true })
  const height = inspector.getByRole('spinbutton', { name: 'Height', exact: true })
  await expect(width).toHaveAttribute('aria-valuenow', '120.5')
  await expect(height).toHaveAttribute('aria-valuenow', '80.75')
  await width.dblclick()
  await width.fill('123.456789')
  await width.press('Enter')
  await expect(width).toHaveAttribute('aria-valuenow', '123.456789')
  await expect(width.locator('[data-slot="value"]')).toHaveText('123.46')
  expect((await getSelectedNode(page))?.width).toBe(123.456789)
  await width.dblclick()
  await expect(width).toHaveValue('123.46')
  await width.press('Enter')
  expect((await getSelectedNode(page))?.width).toBe(123.456789)
  await width.dblclick()
  await width.fill('333.333333')
  await width.press('Escape')
  expect((await getSelectedNode(page))?.width).toBe(123.456789)
  await canvas.undo()
  await expect(width).toHaveAttribute('aria-valuenow', '120.5')
  await width.dblclick()
  await width.fill('131.25')
  await width.press('Enter')
  await expect(width).toHaveAttribute('aria-valuenow', '131.25')
  await canvas.undo()
  await expect(width).toHaveAttribute('aria-valuenow', '120.5')
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await canvas.redo()
  await height.dblclick()
  await height.fill('91.5')
  await height.press('Escape')
  await expect(height).toHaveAttribute('aria-valuenow', '80.75')
  await height.dblclick()
  await height.fill('91.5')
  await height.press('Enter')
  await expect(height).toHaveAttribute('aria-valuenow', '91.5')
  await canvas.undo()
  await expect(height).toHaveAttribute('aria-valuenow', '80.75')
  await canvas.redo()
  expect(await getSelectedNode(page)).toMatchObject({
    x: 12.5,
    y: 16.25,
    width: 131.25,
    height: 91.5,
    cornerRadius: 3.5
  })
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  expect(parsePenDocument(bytes.toString()).children[0]).toMatchObject({
    x: 12.5,
    y: 16.25,
    width: 131.25,
    height: 91.5,
    cornerRadius: 3.5
  })
  const reopen = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await reopen
  ).setFiles({ name: 'fractional-size-reopened.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await select()
  await expect(width).toHaveAttribute('aria-valuenow', '131.25')
  await expect(height).toHaveAttribute('aria-valuenow', '91.5')
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  await expect(width).toHaveAttribute('aria-valuenow', '131.25')
  await expect(height).toHaveAttribute('aria-valuenow', '91.5')
  await width.dblclick()
  await width.fill('123.456789')
  await width.press('Enter')
  const widthField = inspector.locator('[data-property="width"]')
  await widthField.getByRole('button', { name: 'Apply variable', exact: true }).click()
  await page
    .getByRole('button', { name: 'Create number variable from 123.456789', exact: true })
    .click()
  await page.getByPlaceholder('Variable name').fill('Dimensions/Precise width')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(widthField).toHaveAttribute('data-bound')
  expect((await getSelectedNode(page))?.width).toBe(123.456789)
  await canvas.undo()
  await expect(widthField).not.toHaveAttribute('data-bound')
  expect((await getSelectedNode(page))?.width).toBe(123.456789)
  canvas.assertNoErrors()
})
