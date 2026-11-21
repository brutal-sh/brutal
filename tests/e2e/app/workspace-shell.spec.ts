import { expect, test } from '@playwright/test'

import { toolbarFlyoutTestId } from '@open-pencil/vue/testing'

import { expectDefined } from '#tests/helpers/assert'
import { CanvasHelper } from '#tests/helpers/canvas'

test('Find layers focuses matching layers without adding document history', async ({
  page
}, testInfo) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test')
  await canvas.waitForInit()
  await canvas.drawRect(220, 220, 160, 80)
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  const layers = page.getByTestId('layers-item')
  await expect(layers).toHaveCount(1)
  await page.getByRole('button', { name: 'Find layers', exact: true }).click()
  const search = page.getByRole('dialog', { name: 'Find layers', exact: true })
  const input = search.getByRole('textbox', { name: 'Find layers', exact: true })
  await expect(input).toBeFocused()
  await input.fill('rectangle')
  await search.getByRole('button', { name: 'Rectangle 1', exact: true }).click()
  await expect(page.getByTestId('design-panel-single')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('workspace-layer-search.png') })
  await input.fill('absent layer')
  await expect(search.getByRole('button', { name: 'Rectangle 1', exact: true })).toHaveCount(0)
  await search.getByRole('button', { name: 'Close layer search', exact: true }).click()
  await expect(search).toBeHidden()
  await canvas.undo()
  await expect(layers).toHaveCount(0)
  canvas.assertNoErrors()
})

test('workspace panels switch exclusively and document tabs open and close', async ({
  page
}, testInfo) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test')
  // Capture the app's real fresh-document palette before CanvasHelper's drawing-fixture setup.
  await expect(page.getByTestId('canvas-element')).toHaveAttribute('data-ready', '1')
  await expect(page.getByTestId('canvas-loading')).toBeHidden()
  await expect(page.locator('#loader')).toHaveCount(0)
  await canvas.waitForRender()
  await page.screenshot({ path: testInfo.outputPath('workspace-dark.png') })
  await canvas.waitForInit()
  const navigation = page.getByRole('tablist', { name: 'Workspace panels' })
  try {
    await expect(page.getByTestId('chat-panel')).toBeVisible()
    await expect(page.getByTestId('layers-panel')).toBeHidden()
    await page.screenshot({ path: testInfo.outputPath('workspace-agent.png') })

    await navigation.getByRole('tab', { name: 'Layers', exact: true }).click()
    await expect(page.getByTestId('layers-panel')).toBeVisible()
    await expect(page.getByRole('tabpanel', { name: 'Chat', exact: true })).toBeHidden()
    await navigation.getByRole('tab', { name: 'Components', exact: true }).click()
    await expect(page.getByTestId('assets-panel')).toBeVisible()
    await expect(page.getByTestId('layers-panel')).toBeHidden()
    await expect(page.getByRole('tabpanel', { name: 'Chat', exact: true })).toBeHidden()
    const expandedCanvas = expectDefined(
      await canvas.canvas.boundingBox(),
      'expanded sidebar canvas'
    )
    const sidebarToggle = page.getByRole('button', { name: 'Toggle sidebar', exact: true })
    await sidebarToggle.click()
    await expect(page.getByTestId('assets-panel')).toBeHidden()
    await expect
      .poll(async () => (await canvas.canvas.boundingBox())?.width ?? 0)
      .toBeGreaterThan(expandedCanvas.width)
    await sidebarToggle.click()
    await expect(page.getByTestId('assets-panel')).toBeVisible()
    await expect(navigation.getByRole('tab', { name: 'Components', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect.poll(() => canvas.canvas.boundingBox()).toEqual(expandedCanvas)
    await navigation.getByRole('tab', { name: 'Chat', exact: true }).click()
    await expect(page.getByTestId('chat-panel')).toBeVisible()
    await expect(page.getByTestId('assets-panel')).toBeHidden()

    await page.getByRole('button', { name: 'Variables', exact: true }).click()
    const variables = page.getByTestId('variables-dialog')
    await expect(variables).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('workspace-variables.png') })
    await page.keyboard.press('Escape')
    await expect(variables).toBeHidden()

    await page.getByRole('button', { name: 'Command palette', exact: true }).click()
    const palette = page.getByRole('dialog', { name: 'Command palette', exact: true })
    await expect(palette).toBeVisible()
    await expect(palette.getByRole('searchbox', { name: 'Search commands' })).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath('workspace-command-palette.png') })
    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden()

    const tabs = page.getByTestId('tabbar-tab')
    const initialCount = await tabs.count()
    await page.getByTestId('tabbar-new').click()
    await expect(tabs).toHaveCount(initialCount + 1)
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
    await canvas.waitForInit()
    await page.locator('[data-slot="tab-item"]').last().getByTestId('tabbar-close').click()
    await expect(tabs).toHaveCount(initialCount)
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
    canvas.assertNoErrors()
  } finally {
    await page.screenshot({ path: testInfo.outputPath('workspace-navigation.png') })
  }
})

test('vertical tools draw on a stable canvas while inspector and zoom controls work', async ({
  page
}, testInfo) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test')
  await canvas.waitForInit()
  try {
    const toolbar = page.getByTestId('toolbar')
    await expect(toolbar).toHaveAttribute('aria-orientation', 'vertical')
    const canvasBefore = expectDefined(await canvas.canvas.boundingBox(), 'canvas bounds')
    const rail = expectDefined(await toolbar.boundingBox(), 'tool rail bounds')
    expect(rail.width).toBe(36)
    await expect(page.getByRole('button', { name: 'Toggle sidebar', exact: true })).toHaveCSS(
      'width',
      '28px'
    )
    await expect(page.getByRole('button', { name: 'Command palette', exact: true })).toHaveCSS(
      'width',
      '28px'
    )
    const move = toolbar.getByRole('button', { name: 'Move', exact: true })
    await expect(move).toHaveCSS('width', '28px')
    await expect(move).toHaveCSS('height', '28px')
    await expect(move).toHaveCSS('border-top-width', '1px')
    await expect(move).toHaveCSS('border-top-style', 'solid')
    await expect(move).toHaveCSS('border-top-color', 'rgb(63, 63, 70)')
    await expect(toolbar).toHaveCSS('background-color', 'rgb(39, 39, 42)')
    await expect(toolbar).toHaveCSS('border-top-color', 'rgba(160, 178, 204, 0.13)')
    await page.getByTestId(toolbarFlyoutTestId('SELECT')).click()
    const moveMenu = page.getByRole('menu')
    await expect(moveMenu).toHaveCSS('border-top-color', 'rgb(32, 32, 32)')
    await expect(moveMenu).toHaveCSS('border-top-width', '1px')
    await expect(moveMenu.getByRole('menuitemradio', { name: /^Move/ })).toBeVisible()
    await expect(moveMenu.getByRole('menuitemradio', { name: /^Scale/ })).toBeVisible()
    await expect(moveMenu.getByRole('menuitemradio', { name: /^Move/ })).toHaveCSS(
      'font-size',
      '12px'
    )
    await page.screenshot({ path: testInfo.outputPath('workspace-move-menu.png') })
    await page.keyboard.press('Escape')
    expect(rail.height).toBeGreaterThan(rail.width)
    expect(rail.x).toBeGreaterThanOrEqual(canvasBefore.x)
    expect(rail.y).toBeGreaterThanOrEqual(canvasBefore.y)
    expect(rail.x + rail.width).toBeLessThan(canvasBefore.x + canvasBefore.width)
    await expect(page.getByTestId('properties-panel')).toBeHidden()

    const buttons = toolbar.getByRole('button')
    await buttons.first().focus()
    await buttons.first().press('ArrowDown')
    await expect(buttons.nth(1)).toBeFocused()
    await page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
    const shapeMenu = page.getByRole('menu')
    await expect(shapeMenu).toBeVisible()
    const menuBounds = expectDefined(await shapeMenu.boundingBox(), 'shape menu bounds')
    const viewport = expectDefined(page.viewportSize(), 'viewport')
    expect(menuBounds.y).toBeGreaterThanOrEqual(0)
    expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(viewport.height)
    await shapeMenu.getByRole('menuitemradio', { name: /^Rectangle/ }).click()
    await toolbar.getByRole('button', { name: 'Rectangle', exact: true }).click()
    await canvas.drag(170, 200, 330, 300)
    await expect(page.getByTestId('design-panel-single')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
    await expect.poll(() => canvas.canvas.boundingBox()).toEqual(canvasBefore)
    await page.screenshot({ path: testInfo.outputPath('workspace-selection.png') })

    const zoom = page.getByTestId('zoom-dropdown-trigger')
    const initialZoom = Number((await zoom.innerText()).replace('%', ''))
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await expect
      .poll(async () => Number((await zoom.innerText()).replace('%', '')))
      .toBeGreaterThan(initialZoom)
    const zoomedIn = Number((await zoom.innerText()).replace('%', ''))
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
    await expect
      .poll(async () => Number((await zoom.innerText()).replace('%', '')))
      .toBeLessThan(zoomedIn)
    await zoom.click()
    await page.getByRole('menuitem', { name: /100%/ }).click()
    await expect(zoom).toHaveText('100%')

    await page
      .getByRole('tablist', { name: 'Workspace panels' })
      .getByRole('tab', { name: 'Layers', exact: true })
      .click()
    await expect(page.getByTestId('layers-item')).toHaveCount(1)
    await page.getByTestId('layers-item').first().click()
    await canvas.duplicate()
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    await canvas.undo()
    await expect(page.getByTestId('layers-item')).toHaveCount(1)
    await canvas.pressKey('Escape')
    await expect(page.getByTestId('properties-panel')).toBeHidden()
    await expect.poll(() => canvas.canvas.boundingBox()).toEqual(canvasBefore)
    canvas.assertNoErrors()
  } finally {
    await page.screenshot({ path: testInfo.outputPath('workspace-tools.png') })
  }
})
