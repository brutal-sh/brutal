import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { readScenePixels } from '#tests/helpers/canvas/pixels'
import { propertyItems, propertySection } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetup()

test('gradient stops edit in a separate popup, retain Escape changes and render with one stop', async () => {
  await editor.canvas.clearCanvas()
  await editor.canvas.pressKey('Escape')
  await editor.canvas.waitForRender()
  // fresh rect with default solid fill
  await editor.canvas.drawRect(300, 300, 80, 80)
  await editor.canvas.waitForRender()

  await expect(propertySection(editor.page, 'Fill')).toBeVisible({ timeout: 5000 })

  const fillItem = propertyItems(editor.page, 'fills').first()
  await expect(fillItem).toBeVisible({ timeout: 5000 })
  const fillSwatch = fillItem.getByTestId('fill-picker-swatch')
  await expect(fillSwatch).toBeVisible({ timeout: 5000 })
  await fillSwatch.click()
  await editor.canvas.waitForRender()

  await editor.page.getByTestId('fill-picker-tab-gradient').click()
  await editor.canvas.waitForRender()

  const node = expectDefined(await getSelectedNode(editor.page), 'gradient-filled node')
  expect(node.fills[0]?.type).toBe('GRADIENT_LINEAR')
  await expect(editor.page.getByRole('spinbutton', { name: 'Red', exact: true })).toHaveCount(0)
  await editor.page.getByRole('button', { name: 'Edit color', exact: true }).first().click()
  const red = editor.page.getByRole('spinbutton', { name: 'Red', exact: true })
  await red.fill('17')
  await red.press('Tab')
  await editor.page.getByRole('spinbutton', { name: 'Green', exact: true }).fill('0')
  const blue = editor.page.getByRole('spinbutton', { name: 'Blue', exact: true })
  await blue.fill('255')
  await blue.press('Tab')
  await expect
    .poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.gradientStops?.[0]?.color.r)
    .toBeCloseTo(17 / 255)
  await editor.page.keyboard.press('Escape')
  await expect(red).toHaveCount(0)
  await expect(editor.page.getByTestId('fill-picker-gradient-bar')).toBeVisible()
  await editor.page
    .getByRole('button', { name: 'Remove gradient stop', exact: true })
    .last()
    .click()
  await expect
    .poll(async () => (await getSelectedNode(editor.page))?.fills[0]?.gradientStops?.length)
    .toBe(1)
  await expect(
    editor.page.getByRole('button', { name: 'Remove gradient stop', exact: true })
  ).toHaveCount(0)
  await editor.page.keyboard.press('Escape')
  await expect
    .poll(() => readScenePixels(editor.page, [{ x: 340, y: 340 }]))
    .toEqual([[17, 0, 255, 255]])
  for (const subtype of ['Radial', 'Angular']) {
    await fillSwatch.click()
    await editor.page.locator('[data-picker-content]').getByRole('combobox').click()
    await editor.page.getByRole('option', { name: subtype, exact: true }).click()
    await editor.page.keyboard.press('Escape')
    await expect
      .poll(() => readScenePixels(editor.page, [{ x: 340, y: 340 }]))
      .toEqual([[17, 0, 255, 255]])
  }
  editor.canvas.assertNoErrors()
})
