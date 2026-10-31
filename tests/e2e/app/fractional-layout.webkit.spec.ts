import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('fractional gap and padding retain their values through editing, Undo and save/reopen', async ({
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
    name: 'fractional-layout.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'row',
            type: 'frame',
            name: 'Fractional row',
            width: 300,
            height: 100,
            layout: 'horizontal',
            gap: 12.5,
            padding: [5.5, 10.5, 15.5, 20.5],
            children: ['a', 'b'].map((id) => ({
              id,
              type: 'rectangle',
              name: id,
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
  const selectRow = () =>
    page.getByTestId('layers-item').filter({ hasText: 'Fractional row' }).first().click()
  await selectRow()
  const inspector = page.getByTestId('properties-panel')
  const gap = inspector.getByRole('spinbutton', { name: 'Fixed gap amount', exact: true })
  const left = inspector.getByRole('spinbutton', { name: 'paddingLeft', exact: true })
  await expect(gap).toHaveAttribute('aria-valuenow', '12.5')
  for (const [name, value] of [
    ['paddingLeft', '20.5'],
    ['paddingRight', '10.5'],
    ['paddingTop', '5.5'],
    ['paddingBottom', '15.5']
  ]) {
    await expect(inspector.getByRole('spinbutton', { name, exact: true })).toHaveAttribute(
      'aria-valuenow',
      value
    )
  }
  await gap.dblclick()
  await gap.fill('7.25')
  await gap.press('Enter')
  await expect(gap).toHaveAttribute('aria-valuenow', '7.25')
  await canvas.undo()
  await expect(gap).toHaveAttribute('aria-valuenow', '12.5')
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await canvas.redo()
  await left.dblclick()
  await left.fill('33.25')
  await left.press('Enter')
  await expect(left).toHaveAttribute('aria-valuenow', '33.25')
  await canvas.undo()
  await expect(left).toHaveAttribute('aria-valuenow', '20.5')
  await canvas.redo()
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const bytes = await readFile(await (await download).path())
  expect(parsePenDocument(bytes.toString()).children[0]).toMatchObject({
    gap: 7.25,
    padding: [5.5, 10.5, 15.5, 33.25]
  })
  const reopen = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await reopen
  ).setFiles({ name: 'fractional-reopened.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await selectRow()
  await expect(gap).toHaveAttribute('aria-valuenow', '7.25')
  await expect(left).toHaveAttribute('aria-valuenow', '33.25')
  await inspector.getByRole('button', { name: 'Individual padding', exact: true }).click()
  const horizontal = inspector.getByRole('spinbutton', { name: 'Horizontal padding', exact: true })
  await expect(
    inspector.getByRole('spinbutton', { name: 'Vertical padding', exact: true })
  ).toHaveAttribute('aria-valuenow', '5.5')
  await expect(horizontal).toHaveAttribute('aria-valuenow', '10.5')
  await horizontal.dblclick()
  await horizontal.fill('21.25')
  await horizontal.press('Enter')
  await expect(horizontal).toHaveAttribute('aria-valuenow', '21.25')
  await canvas.undo()
  await expect(horizontal).toHaveAttribute('aria-valuenow', '10.5')
  await canvas.undo()
  await expect(left).toHaveAttribute('aria-valuenow', '33.25')
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
  const advancedGap = inspector.locator('[data-property="itemSpacing"]')
  await advancedGap.getByRole('button', { name: 'Apply variable', exact: true }).click()
  await page.getByRole('button', { name: 'Create number variable from 7.25', exact: true }).click()
  await page.getByPlaceholder('Variable name').fill('Fractional gap')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(advancedGap).toHaveAttribute('data-bound')
  await expect
    .poll(() =>
      page.evaluate(() => window.openPencil?.getStore?.().graph.getNode('row')?.itemSpacing)
    )
    .toBe(7.25)
  canvas.assertNoErrors()
})
