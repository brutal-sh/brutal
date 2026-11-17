import { readFile } from 'node:fs/promises'

import { parsePenDocument } from '@open-pencil/pen'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAppMenu } from '#tests/helpers/menu'
import { openAdvancedProperties, propertyItems } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useIsolatedEditorSetupWithClear('/', mockOfficialCloudDiscovery)

test.beforeEach(async () => {
  await editor.canvas.drawRect(120, 100, 160, 120)
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'RGBA', exact: true }).click()
})

async function draftChannel(name: string, expression: string) {
  const input = editor.page
    .locator('[data-picker-content]')
    .getByRole('spinbutton', { name, exact: true })
  await input.focus()
  await input.press('ControlOrMeta+a')
  await input.pressSequentially(expression)
  return input
}

async function enterChannel(name: string, expression: string) {
  await (await draftChannel(name, expression)).press('Enter')
}

test('RGBA red evaluates a complete arithmetic expression', async ({ page }, testInfo) => {
  await enterChannel('Red', '120*2')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color.r).toBe(240 / 255)
  editor.canvas.assertNoErrors()
  await testInfo.attach('rgba-arithmetic', {
    body: await page.locator('[data-picker-content]').screenshot({ animations: 'disabled' }),
    contentType: 'image/png'
  })
})

test('RGBA invalid arithmetic retains the committed channel', async () => {
  await enterChannel('Red', '38')
  const before = (await getSelectedNode(editor.page))?.fills[0]?.color
  await enterChannel('Red', '1+')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual(before)
  editor.canvas.assertNoErrors()
})

test('channel cancellation preserves the color and arithmetic steps commit once', async () => {
  await enterChannel('Red', '38')
  const before = (await getSelectedNode(editor.page))?.fills[0]?.color
  const red = await draftChannel('Red', '77')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual(before)
  await red.press('Escape')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual(before)
  await expect(editor.page.locator('[data-picker-content]')).toHaveCount(0)
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  const alpha = await draftChannel('Alpha', '0.2*2')
  await alpha.press('ArrowUp')
  await alpha.press('Enter')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color.a).toBe(0.41)
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.color)
    .toEqual(before)
  await editor.page.keyboard.press('ControlOrMeta+Shift+z')
  await expect.poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.color.a).toBe(0.41)
  editor.canvas.assertNoErrors()
})

test('RGBA arithmetic clamps to the channel bounds', async () => {
  await enterChannel('Red', '(1440-32)/3')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color.r).toBe(1)
  await enterChannel('Red', '-10')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color.r).toBe(0)
  editor.canvas.assertNoErrors()
})

test('HSL channels evaluate arithmetic and retain their color after invalid input', async () => {
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'HSL', exact: true }).click()
  await enterChannel('Saturation', '100')
  await enterChannel('Lightness', '50')
  await enterChannel('Hue', '120*2')
  const color = (await getSelectedNode(editor.page))?.fills[0]?.color
  expect(color).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  await enterChannel('Hue', '1+')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual(color)
  editor.canvas.assertNoErrors()
})

test('advanced HSB channels use the same arithmetic field', async () => {
  await editor.page.keyboard.press('Escape')
  await openAdvancedProperties(editor.page)
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'HSB', exact: true }).click()
  const channels = editor.page.getByRole('group', { name: 'HSB', exact: true })
  for (const [name, expression] of [
    ['Saturation', '50*2'],
    ['Brightness', '25*4'],
    ['Hue', '120*2']
  ]) {
    const input = channels.getByRole('spinbutton', { name, exact: true })
    await input.focus()
    await input.press('ControlOrMeta+a')
    await input.pressSequentially(expression)
    await input.press('Enter')
  }
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  editor.canvas.assertNoErrors()
})

test('RGBA alpha evaluates arithmetic and retains its value after division by zero', async () => {
  await enterChannel('Alpha', '0.25*2')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color.a).toBe(0.5)
  await enterChannel('Alpha', '1/0')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color.a).toBe(0.5)
  editor.canvas.assertNoErrors()
})

async function setFractionalColor() {
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'CSS', exact: true }).click()
  const css = editor.page.getByRole('textbox', { name: 'CSS', exact: true })
  await css.fill('rgba(38.25, 100.5, 235.75, 0.123456)')
  await css.press('Shift+Tab')
  const before = (await getSelectedNode(editor.page))?.fills[0]?.color
  expect(before).toEqual({ r: 38.25 / 255, g: 100.5 / 255, b: 235.75 / 255, a: 0.123456 })
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'RGBA', exact: true }).click()
  return before
}

test('focus, blur and Enter preserve untouched fractional color channels', async () => {
  const before = await setFractionalColor()
  for (const name of ['Red', 'Green', 'Blue', 'Alpha']) {
    const input = editor.page.getByRole('spinbutton', { name, exact: true })
    await input.focus()
    await input.press('Tab')
    expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual(before)
    await input.focus()
    await input.press('Enter')
    expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual(before)
  }
  editor.canvas.assertNoErrors()
})

test('explicit RGB arithmetic applies a result equal to the rounded display', async () => {
  await setFractionalColor()
  await enterChannel('Red', '19*2')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual({
    r: 38 / 255,
    g: 100.5 / 255,
    b: 235.75 / 255,
    a: 0.123456
  })
  editor.canvas.assertNoErrors()
})

test('explicit alpha arithmetic applies a result equal to the rounded display', async () => {
  await setFractionalColor()
  await enterChannel('Alpha', '0.06*2')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual({
    r: 38.25 / 255,
    g: 100.5 / 255,
    b: 235.75 / 255,
    a: 0.12
  })
  editor.canvas.assertNoErrors()
})

test('arithmetic color saves and reopens through the pen document workflow', async () => {
  const { page, canvas } = editor
  await enterChannel('Red', '120*2')
  await enterChannel('Green', '0')
  await enterChannel('Blue', '0')
  await enterChannel('Alpha', '0.25*2')
  await page.keyboard.press('Escape')
  const placed = await getSelectedNode(page)
  if (!placed) throw new Error('Edited rectangle missing')
  await page.evaluate(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  page.once('dialog', (dialog) => dialog.accept('color-arithmetic.pen'))
  const downloading = page.waitForEvent('download')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
  const bytes = await readFile(await (await downloading).path())
  expect(parsePenDocument(bytes.toString()).children[0]?.fill).toEqual([
    { type: 'color', color: '#F0000080', enabled: true }
  ])
  await page.getByTestId('tabbar-close').click()
  const choosing = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (
    await choosing
  ).setFiles({ name: 'color-arithmetic.pen', mimeType: 'application/json', buffer: bytes })
  await canvas.waitForInit()
  await canvas.selectAll()
  expect((await getSelectedNode(page))?.fills[0]?.color).toEqual({
    r: 240 / 255,
    g: 0,
    b: 0,
    a: 128 / 255
  })
  canvas.assertNoErrors()
})
