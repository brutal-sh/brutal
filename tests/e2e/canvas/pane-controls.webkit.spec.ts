import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'
import { getPageChildren, getSelectedIds } from '#tests/helpers/store'

async function drawInLastPane(page: Page) {
  const area = page.getByTestId('canvas-area').last()
  await area.click({ position: { x: 100, y: 100 } })
  await page.keyboard.press('r')
  const box = await area.boundingBox()
  if (!box) throw new Error('Pane canvas is not visible')
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 140, box.y + 130, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.press('v')
}

for (const layout of [
  { name: 'horizontal', splits: ['Split right'] },
  { name: 'vertical', splits: ['Split down'] },
  { name: 'nested', splits: ['Split right', 'Split down', 'Split right'] }
]) {
  for (const selected of [false, true]) {
    for (const closeFrom of ['first', 'last']) {
      test(`pointer closes ${layout.name} panes from ${closeFrom} ${selected ? 'with' : 'without'} the inspector`, async ({
        page
      }, info) => {
        await page.goto('/')
        const canvas = new CanvasHelper(page)
        await canvas.waitForInit()
        await canvas.drawRect(140, 180, 180, 120)
        if (!selected) await canvas.pressKey('Escape')
        else await page.getByRole('button', { name: 'Toggle inspector', exact: true }).click()
        expect(await getSelectedIds(page)).toBe(selected ? 1 : 0)
        const original = await getPageChildren(page)
        for (const command of layout.splits) {
          await openAppMenu(page, 'View')
          await page.getByRole('menuitem', { name: command, exact: true }).click()
        }
        const headers = page.locator('[data-slot="canvas-pane-header"]')
        await expect(headers).toHaveCount(layout.splits.length + 1)
        for (const header of await headers.all()) {
          await header
            .getByRole('button', { name: 'Split right / Split down', exact: true })
            .click()
          await expect(
            page.getByRole('menuitem', { name: 'Split right', exact: true })
          ).toBeVisible()
          await page.keyboard.press('Escape')
        }
        await drawInLastPane(page)
        const drawn = await getPageChildren(page)
        expect(drawn).toHaveLength(2)
        expect(drawn[0]).toEqual(original[0])
        expect(drawn[1]).toMatchObject({ width: 40, height: 30 })
        await page.screenshot({ path: info.outputPath('before-close.png') })
        for (let remaining = layout.splits.length; remaining > 0; remaining--) {
          const header = closeFrom === 'first' ? headers.first() : headers.last()
          await header.getByRole('button', { name: 'Close view', exact: true }).click()
          await expect(headers).toHaveCount(remaining === 1 ? 0 : remaining)
        }
        expect(await getPageChildren(page)).toEqual(drawn)
        canvas.assertNoErrors()
      })
    }
  }
}
