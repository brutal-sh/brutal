import { expect, test, type Locator, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'

async function activateControl(
  page: Page,
  header: Locator,
  name: string,
  activation: 'pointer' | 'keyboard'
) {
  const bounds = await header.boundingBox()
  const control = header.getByRole('button', { name, exact: true })
  const button = await control.boundingBox()
  if (!bounds || !button) throw new Error('Pane control is not visible')
  expect(button.x).toBeGreaterThanOrEqual(bounds.x)
  expect(button.x + button.width).toBeLessThanOrEqual(bounds.x + bounds.width)
  expect(button.y).toBeGreaterThanOrEqual(bounds.y)
  expect(button.y + button.height).toBeLessThanOrEqual(bounds.y + bounds.height)
  if (activation === 'keyboard') {
    await control.focus()
    await expect(control).toBeFocused()
    await control.press('Enter')
  } else await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2)
}

async function constrainWorkspace(page: Page) {
  const workspaceHandle = await page.getByTestId('left-splitter-handle').boundingBox()
  const surface = await page.locator('[data-slot="canvas-split-root"]').boundingBox()
  if (!workspaceHandle || !surface) throw new Error('Workspace splitter is not visible')
  const x = workspaceHandle.x + workspaceHandle.width / 2
  const y = workspaceHandle.y + workspaceHandle.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + surface.width - 243, y, { steps: 8 })
  await page.mouse.up()
}

async function prepareNarrowPane(page: Page, edge: string, constrained: boolean) {
  if (constrained) await page.setViewportSize({ width: 880, height: 800 })
  await mockOfficialCloudDiscovery(page)
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await page.getByRole('button', { name: 'Toggle inspector', exact: true }).click()
  await openAppMenu(page, 'View')
  await page.getByRole('menuitem', { name: 'Split right', exact: true }).click()
  if (constrained) await constrainWorkspace(page)
  const root = await page.locator('[data-slot="canvas-split-root"]').boundingBox()
  const handle = await page.locator('[data-split-id]').first().boundingBox()
  if (!root || !handle) throw new Error('Split layout is not visible')
  const y = handle.y + handle.height / 2
  await page.mouse.move(handle.x + handle.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(edge === 'first' ? root.x + 5 : root.x + root.width - 5, y, {
    steps: 8
  })
  await page.mouse.up()
  const headers = page.locator('[data-slot="canvas-pane-header"]')
  const header = edge === 'first' ? headers.first() : headers.last()
  expect((await header.boundingBox())?.width).toBeLessThan(constrained ? 48 : 100)
  return { canvas, headers, header }
}

for (const constrained of [false, true]) {
  for (const edge of ['first', 'last']) {
    for (const activation of ['pointer', 'keyboard'] as const) {
      test(`${activation} reaches Split and Close in narrow ${edge} pane after resizing${constrained ? ' in constrained workspace' : ''}`, async ({
        page
      }, info) => {
        const { canvas, headers, header } = await prepareNarrowPane(page, edge, constrained)
        await page.screenshot({ path: info.outputPath('narrow-header.png') })
        await activateControl(page, header, 'Split right / Split down', activation)
        await expect(page.getByRole('menuitem', { name: 'Split down', exact: true })).toBeVisible()
        await page.keyboard.press('Escape')
        await activateControl(page, header, 'Close view', activation)
        await expect(headers).toHaveCount(0)
        canvas.assertNoErrors()
      })
    }
  }
}

async function resizeNestedHeight(page: Page) {
  const group = page.locator('[data-panel-group][data-orientation="vertical"]')
  const bounds = await group.boundingBox()
  const handle = await group.locator('[data-split-id]').first().boundingBox()
  if (!bounds || !handle) throw new Error('Nested vertical splitter is not visible')
  const x = handle.x + handle.width / 2
  await page.mouse.move(x, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(x, bounds.y + 5, { steps: 8 })
  await page.mouse.up()
  return group.locator('[data-slot="canvas-pane-header"]').first()
}

for (const edge of ['first', 'last']) {
  for (const direction of ['right', 'down']) {
    test(`nested split ${direction} preserves controls in the narrow ${edge} pane`, async ({
      page
    }, info) => {
      const { canvas, headers, header } = await prepareNarrowPane(page, edge, true)
      await activateControl(page, header, 'Split right / Split down', 'pointer')
      await page.getByRole('menuitem', { name: `Split ${direction}`, exact: true }).click()
      await expect(headers).toHaveCount(3)
      const nested = direction === 'down' ? await resizeNestedHeight(page) : header
      await activateControl(page, nested, 'Split right / Split down', 'pointer')
      await page.getByRole('menuitem', { name: `Split ${direction}`, exact: true }).click()
      await expect(headers).toHaveCount(4)
      await page.screenshot({ path: info.outputPath('nested-narrow-header.png') })
      for (const candidate of await headers.all()) {
        await activateControl(page, candidate, 'Split right / Split down', 'pointer')
        await page.keyboard.press('Escape')
      }
      while ((await headers.count()) > 0) {
        await activateControl(page, headers.first(), 'Close view', 'pointer')
      }
      canvas.assertNoErrors()
    })
  }
}
