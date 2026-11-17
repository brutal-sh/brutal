import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { propertyItems, propertySection } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetup('/', mockOfficialCloudDiscovery)

async function chooseFormat(name: string) {
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name, exact: true }).click()
}

test('compact RGBA, HEX, CSS and HSL edit the same color and retain a global format preference', async () => {
  await editor.canvas.drawRect(300, 300, 80, 80)
  const fill = propertyItems(editor.page, 'fills').first()
  await fill.getByTestId('fill-picker-swatch').click()
  const panel = editor.page.locator('[data-picker-content]')
  await expect(panel).toHaveCSS('width', '264px')
  await expect(panel.locator('.cursor-crosshair')).toHaveCSS('height', '194px')
  const alpha = panel.getByRole('spinbutton', { name: 'Alpha', exact: true })
  await alpha.focus()
  await alpha.fill('0.25')
  await alpha.press('Tab')
  await chooseFormat('HEX')
  const hex = panel.getByRole('textbox', { name: 'HEX', exact: true })
  await hex.fill('00FF00')
  await hex.press('Shift+Tab')
  await expect
    .poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.color)
    .toEqual({
      r: 0,
      g: 1,
      b: 0,
      a: 0.25
    })
  await hex.fill('not-hex')
  await hex.press('Shift+Tab')
  await expect(hex).toHaveAttribute('aria-invalid', 'true')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual({
    r: 0,
    g: 1,
    b: 0,
    a: 0.25
  })
  await chooseFormat('CSS')
  const css = panel.getByRole('textbox', { name: 'CSS', exact: true })
  await css.fill('rgba(18, 52, 86, 0.5)')
  await css.press('Shift+Tab')
  await expect
    .poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.color)
    .toEqual({
      r: 18 / 255,
      g: 52 / 255,
      b: 86 / 255,
      a: 0.5
    })
  await expect(
    panel.getByRole('slider', { name: 'Saturation, Brightness', exact: true })
  ).toHaveAttribute('aria-valuenow', '79')
  await css.fill('var(--not-a-color)')
  await css.press('Shift+Tab')
  await expect(css).toHaveAttribute('aria-invalid', 'true')
  expect((await getSelectedNode(editor.page))?.fills[0]?.color).toEqual({
    r: 18 / 255,
    g: 52 / 255,
    b: 86 / 255,
    a: 0.5
  })
  await css.fill('hsl(120 100% 50% / 75%)')
  await css.press('Shift+Tab')
  await expect(css).not.toHaveAttribute('aria-invalid', 'true')
  await chooseFormat('HSL')
  const hue = panel.getByRole('spinbutton', { name: 'Hue', exact: true })
  await hue.focus()
  await expect(hue).toHaveValue('120')
  await alpha.focus()
  await expect(alpha).toHaveValue('0.75')
  await hue.focus()
  await hue.fill('240')
  await hue.press('Tab')
  await alpha.focus()
  await alpha.fill('0.5')
  await alpha.press('Tab')
  await chooseFormat('RGBA')
  const blue = panel.getByRole('spinbutton', { name: 'Blue', exact: true })
  await blue.focus()
  await expect(blue).toHaveValue('255')
  await alpha.focus()
  await expect(alpha).toHaveValue('0.5')
  await chooseFormat('CSS')
  await editor.page.keyboard.press('Escape')
  await expect
    .poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.color)
    .toEqual({
      r: 0,
      g: 0,
      b: 1,
      a: 0.5
    })
  await editor.canvas.drawRect(420, 300, 80, 80)
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await expect(editor.page.getByRole('textbox', { name: 'CSS', exact: true })).toBeVisible()
  editor.canvas.assertNoErrors()
})

test('compact stroke CSS input preserves geometry and supports Undo', async () => {
  await editor.canvas.drawRect(300, 300, 80, 80)
  await propertySection(editor.page, 'Stroke').getByRole('button', { name: 'Add stroke' }).click()
  const before = (await getSelectedNode(editor.page))?.strokes[0]
  if (!before) throw new Error('Expected a stroke before editing')
  await propertyItems(editor.page, 'strokes').first().getByTestId('fill-picker-swatch').click()
  await chooseFormat('CSS')
  const css = editor.page.getByRole('textbox', { name: 'CSS', exact: true })
  await css.fill('rgba(12, 34, 56, 0.4)')
  await css.press('Shift+Tab')
  await editor.page.keyboard.press('Escape')
  expect((await getSelectedNode(editor.page))?.strokes[0]).toMatchObject({
    weight: before.weight,
    align: before.align,
    color: { r: 12 / 255, g: 34 / 255, b: 56 / 255, a: 0.4 },
    opacity: 0.4
  })
  await editor.canvas.undo()
  expect((await getSelectedNode(editor.page))?.strokes[0]).toEqual(before)
  editor.canvas.assertNoErrors()
})

test('picker keyboard navigation edits color without nudging the selected layer', async () => {
  await editor.canvas.drawRect(300, 300, 80, 80)
  const before = await getSelectedNode(editor.page)
  if (!before) throw new Error('Expected a selected rectangle')
  await propertyItems(editor.page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await chooseFormat('RGBA')
  const format = editor.page.getByTestId('color-format-select')
  await format.focus()
  await format.press('Space')
  await expect(editor.page.getByRole('option', { name: 'RGBA', exact: true })).toBeFocused()
  await editor.page.keyboard.press('ArrowDown')
  await expect(editor.page.getByRole('option', { name: 'HEX', exact: true })).toBeFocused()
  await editor.page.keyboard.press('ArrowDown')
  await expect(editor.page.getByRole('option', { name: 'CSS', exact: true })).toBeFocused()
  await editor.page.keyboard.press('Enter')
  await expect(editor.page.getByRole('textbox', { name: 'CSS', exact: true })).toBeVisible()
  await chooseFormat('HSL')
  const hue = editor.page.getByRole('spinbutton', { name: 'Hue', exact: true })
  await hue.focus()
  await hue.fill('120')
  await hue.press('Tab')
  const thumb = editor.page.getByRole('slider', { name: 'Saturation, Brightness', exact: true })
  await thumb.focus()
  await thumb.press('ArrowRight')
  const edited = await getSelectedNode(editor.page)
  expect(edited).toMatchObject({
    x: before.x,
    y: before.y,
    width: before.width,
    height: before.height
  })
  expect(edited?.fills[0]?.color).not.toEqual(before.fills[0]?.color)
  await editor.page.keyboard.press('Escape')
  await editor.canvas.click(340, 340)
  await editor.page.keyboard.press('ArrowRight')
  expect(await getSelectedNode(editor.page)).toMatchObject({ x: before.x + 1, y: before.y })
  await editor.canvas.undo()
  expect(await getSelectedNode(editor.page)).toMatchObject({ x: before.x, y: before.y })
  editor.canvas.assertNoErrors()
})
