import { readFile } from 'node:fs/promises'

import { parsePenDocument } from '@open-pencil/pen'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { openAdvancedProperties, propertyField } from '#tests/helpers/properties'
import { getNodeById, getPageChildren, getSelectedNode } from '#tests/helpers/store'
import { toolbarFlyoutTestId, toolbarToolTestId } from '#tests/helpers/test-ids'

const ctx = useIsolatedEditorSetupWithClear('/', async (page) => {
  await mockOfficialCloudDiscovery(page)
  await page.route('https://api.iconify.design/lucide.json*', (route) =>
    route.fulfill({
      json: {
        prefix: 'lucide',
        width: 24,
        height: 24,
        icons: { heart: { body: '<path fill="none" stroke="currentColor" d="M2 8L12 20L22 8Z"/>' } }
      }
    })
  )
})

async function arm() {
  await ctx.page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  await ctx.page.getByRole('menuitemradio', { name: 'Icon', exact: true }).click()
  await expect(ctx.page.getByTestId(toolbarToolTestId('ICON'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
}

test('the icon Fill row edits the glyph color and opacity through the shared controls', async () => {
  const { page, canvas } = ctx
  await arm()
  await canvas.click(350, 250)
  await expect(propertyField(page, 'icon-name')).toBeVisible()
  await expect
    .poll(async () => (await getSelectedNode(page))?.childIds.length ?? 0)
    .toBeGreaterThan(0)
  const icon = await getSelectedNode(page)
  const pathId = icon?.childIds[0]
  if (!icon || !pathId) throw new Error('Placed icon artwork missing')
  const fill = page.getByRole('region', { name: 'Fill', exact: true })
  const hex = fill.getByRole('textbox', { name: 'Fill', exact: true })
  await expect(hex).toHaveValue('FFFFFF')
  await hex.fill('1288AA')
  await hex.press('Enter')
  await hex.blur()
  await expect
    .poll(async () => (await getNodeById(page, pathId))?.strokes[0]?.color)
    .toMatchObject({ r: 18 / 255, g: 136 / 255, b: 170 / 255 })
  const opacity = fill.locator('[data-property="opacity"]')
  await opacity.click()
  const input = opacity.getByRole('spinbutton')
  await input.fill('50')
  await input.press('Enter')
  await expect.poll(async () => (await getNodeById(page, pathId))?.strokes[0]?.opacity).toBe(0.5)
  await canvas.undo()
  await expect.poll(async () => (await getNodeById(page, pathId))?.strokes[0]?.opacity).toBe(1)
  await canvas.undo()
  await expect(hex).toHaveValue('FFFFFF')
  await expect
    .poll(async () => (await getNodeById(page, pathId))?.strokes[0]?.color)
    .toEqual({ r: 1, g: 1, b: 1, a: 1 })
  expect((await getSelectedNode(page))?.id).toBe(icon.id)
  canvas.assertNoErrors()
})

test('compact icon controls separate the family and glyph and keep color in Fill', async () => {
  const { page, canvas } = ctx
  await arm()
  await canvas.click(350, 250)
  const name = propertyField(page, 'icon-name')
  await expect(name).toContainText('heart')
  const family = page.getByRole('combobox', { name: 'Icon set', exact: true })
  await expect(family).toHaveText('lucide')
  await expect(propertyField(page, 'icon-color')).toHaveCount(0)
  await family.click()
  await expect(
    page.getByRole('option', { name: 'Material Symbols Rounded', exact: true })
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(family).toBeFocused()
  await expect(name).not.toContainText('lucide')
  canvas.assertNoErrors()
})

test('Primitives focuses Rectangle while remembering Icon and restores trigger focus on Escape', async () => {
  const { page, canvas } = ctx
  await arm()
  await canvas.pressKey('Escape')
  const trigger = page.getByTestId(toolbarFlyoutTestId('RECTANGLE'))
  await trigger.focus()
  await trigger.press('ArrowDown')
  await expect(page.getByRole('menuitemradio', { name: /^Rectangle/ })).toBeFocused()
  await expect(page.getByRole('menuitemradio', { name: 'Icon', exact: true })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitemradio', { name: /^Ellipse/ })).toBeFocused()
  expect(await getPageChildren(page)).toHaveLength(0)
  await expect(page.getByTestId(toolbarToolTestId('SELECT'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="menu"]')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  canvas.assertNoErrors()
})

test('Icon arms without editing, places once, remembers the choice and restores its subtree through history', async () => {
  const { page, canvas } = ctx
  await arm()
  expect(await getPageChildren(page)).toHaveLength(0)
  await expect(page.getByRole('dialog', { name: 'Insert icon' })).toBeHidden()
  await canvas.click(350, 250)
  await expect.poll(async () => (await getSelectedNode(page))?.name).toBe('Icon')
  const icon = await getSelectedNode(page)
  expect(icon).toMatchObject({ type: 'FRAME', width: 24, height: 24 })
  const childId = icon?.childIds[0]
  if (!childId) throw new Error('Placed icon has no vector')
  expect((await getNodeById(page, childId))?.strokes[0]?.color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
  await expect(propertyField(page, 'icon-name')).toContainText('heart')
  await expect(page.getByTestId(toolbarToolTestId('SELECT'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  await expect(page.getByRole('menuitemradio', { name: 'Icon', exact: true })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="menu"]')).toHaveCount(0)
  await canvas.undo()
  expect(await getPageChildren(page)).toHaveLength(0)
  await canvas.redo()
  expect(await getPageChildren(page)).toHaveLength(1)
  expect(await getNodeById(page, childId)).not.toBeNull()
  canvas.assertNoErrors()
})

test('Escape cancels armed placement, and a click inside a frame uses that frame', async () => {
  const { page, canvas } = ctx
  await arm()
  await canvas.pressKey('Escape')
  await canvas.click(350, 250)
  expect(await getPageChildren(page)).toHaveLength(0)
  await canvas.pressKey('f')
  await canvas.drag(250, 180, 500, 400)
  const parent = await getSelectedNode(page)
  if (!parent) throw new Error('Frame was not drawn')
  await arm()
  await canvas.click(300, 230)
  await expect.poll(async () => (await getSelectedNode(page))?.name).toBe('Icon')
  const icon = await getSelectedNode(page)
  if (!icon) throw new Error('Icon was not placed')
  expect((await getNodeById(page, parent.id))?.childIds).toContain(icon.id)
  expect(icon).toMatchObject({ y: 38, width: 24, height: 24 })
  // The browser's mouse delivery can differ by a pixel from a fractional canvas edge.
  expect(Math.abs(icon.x - 38)).toBeLessThan(1)
  expect(await getPageChildren(page)).toHaveLength(1)
  await canvas.undo()
  expect((await getNodeById(page, parent.id))?.childIds).toHaveLength(0)
  canvas.assertNoErrors()
})

test('a placed icon saves as an editable named glyph and reopens through File Open', async () => {
  const { page, canvas } = ctx
  await page.evaluate(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await arm()
  await canvas.click(350, 250)
  await expect(propertyField(page, 'icon-name')).toContainText('heart')
  const placed = await getSelectedNode(page)
  if (!placed) throw new Error('Icon was not placed')
  page.once('dialog', (dialog) => dialog.accept('editable-icon.pen'))
  const downloading = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const saved = await readFile(await (await downloading).path())
  const document = parsePenDocument(saved.toString())
  expect(document.children).toHaveLength(1)
  expect(document.children[0]).toMatchObject({
    id: placed.id,
    name: 'Icon',
    type: 'icon',
    library: 'lucide',
    icon: 'heart',
    width: 24,
    height: 24,
    fill: [{ type: 'color', color: '#FFFFFF', enabled: true }]
  })
  expect(document.children[0].children).toBeUndefined()
  const opening = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await opening
  ).setFiles({ name: 'editable-icon.pen', mimeType: 'application/json', buffer: saved })
  await canvas.waitForInit()
  await expect
    .poll(async () => (await getPageChildren(page)).map((node) => node.id))
    .toEqual([placed.id])
  await page.evaluate((id) => window.openPencil?.getStore?.().select([id]), placed.id)
  await expect(propertyField(page, 'icon-name')).toContainText('heart')
  expect(await getSelectedNode(page)).toMatchObject({
    id: placed.id,
    name: 'Icon',
    type: 'FRAME',
    x: placed.x,
    y: placed.y,
    width: 24,
    height: 24
  })
  const reopened = await getSelectedNode(page)
  if (!reopened?.childIds.length) throw new Error('Reopened icon has no derived artwork')
  expect((await getNodeById(page, reopened.childIds[0]))?.strokes[0]?.color).toEqual({
    r: 1,
    g: 1,
    b: 1,
    a: 1
  })
  canvas.assertNoErrors()
})

test('compact icon controls follow Fill and Advanced retains stroke controls without editing', async () => {
  const { page, canvas } = ctx
  await arm()
  await canvas.click(350, 250)
  await expect(propertyField(page, 'icon-name')).toBeVisible()
  const before = await getSelectedNode(page)
  const sectionOrder = () =>
    page
      .locator('section[aria-label]')
      .evaluateAll((sections) =>
        sections
          .map((section) => section.getAttribute('aria-label'))
          .filter((label) =>
            [
              'Alignment',
              'Position',
              'Layout',
              'Appearance',
              'Fill',
              'Icon',
              'Stroke',
              'Effects'
            ].includes(label ?? '')
          )
      )
  expect(await sectionOrder()).toEqual([
    'Alignment',
    'Position',
    'Layout',
    'Appearance',
    'Fill',
    'Icon',
    'Effects'
  ])
  await expect(page.getByRole('region', { name: 'Stroke', exact: true })).toHaveCount(0)
  await expect(page.locator('[aria-label="Flow"]')).toHaveCount(0)
  await expect(page.getByTestId('clip-content-checkbox')).toHaveCount(0)
  await openAdvancedProperties(page)
  await expect(page.getByRole('region', { name: 'Stroke', exact: true })).toBeVisible()
  await expect(page.locator('[aria-label="Flow"]')).toBeVisible()
  await expect(page.getByTestId('clip-content-checkbox')).toBeVisible()
  await expect(propertyField(page, 'icon-name')).toBeVisible()
  const advanced = await sectionOrder()
  expect(advanced.indexOf('Icon')).toBeLessThan(advanced.indexOf('Fill'))
  expect(await getSelectedNode(page)).toEqual(before)
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Design properties', exact: true })
    .click()
  await expect(page.getByRole('region', { name: 'Stroke', exact: true })).toHaveCount(0)
  await expect(page.locator('[aria-label="Flow"]')).toHaveCount(0)
  await expect(page.getByTestId('clip-content-checkbox')).toHaveCount(0)
  expect(await getSelectedNode(page)).toEqual(before)
  canvas.assertNoErrors()
})
