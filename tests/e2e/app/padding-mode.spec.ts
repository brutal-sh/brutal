import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

test('padding collapse, expansion and Undo preserve the values, mode and affected child geometry', async ({
  page
}) => {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
  })
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await chooser
  ).setFiles({
    name: 'padding.pen',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'row',
            type: 'frame',
            name: 'Padding row',
            width: 300,
            height: 100,
            layout: 'horizontal',
            justifyContent: 'space_around',
            padding: [5, 10, 15, 20],
            children: ['a', 'b'].map((id) => ({
              id,
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
  await page.getByTestId('layers-item').filter({ hasText: 'Padding row' }).first().click()
  const inspector = page.getByTestId('properties-panel')
  const toggle = inspector.getByRole('button', { name: 'Individual padding', exact: true })
  const field = (name: string) => inspector.getByRole('spinbutton', { name, exact: true })
  const positions = () =>
    page.evaluate(() =>
      ['a', 'b'].map((id) => window.openPencil?.getStore?.().graph.getNode(id)?.x)
    )
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(toggle).toHaveCSS('border-radius', '4px')
  await expect(field('paddingLeft')).toHaveAttribute('aria-valuenow', '20')
  await toggle.click()
  await expect(field('Vertical padding')).toHaveAttribute('aria-valuenow', '5')
  await expect(field('Horizontal padding')).toHaveAttribute('aria-valuenow', '10')
  await expect(field('paddingLeft')).toHaveCount(0)
  await expect.poll(positions).toEqual([65, 205])
  await canvas.undo()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(field('paddingLeft')).toHaveAttribute('aria-valuenow', '20')
  await expect(field('paddingBottom')).toHaveAttribute('aria-valuenow', '15')
  await expect.poll(positions).toEqual([72.5, 207.5])
  await expect(page.getByRole('img', { name: 'Unsaved changes', exact: true })).toHaveCount(0)
  await canvas.redo()
  await expect(field('paddingLeft')).toHaveCount(0)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(field('paddingLeft')).toHaveAttribute('aria-valuenow', '10')
  await expect(field('paddingBottom')).toHaveAttribute('aria-valuenow', '5')
  await canvas.undo()
  await expect(field('paddingLeft')).toHaveCount(0)
  await expect.poll(positions).toEqual([65, 205])
  canvas.assertNoErrors()
})
