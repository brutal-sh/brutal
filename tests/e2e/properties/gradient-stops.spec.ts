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

for (const [name, color, opacity] of [
  ['gray', 'D9D9D9', 100],
  ['red', 'FF0000', 100],
  ['translucent red', 'FF0000', 50]
] as const) {
  test(`paint category defaults replace ${name} and use Pen's bottom-to-top gradient`, async () => {
    await editor.canvas.clearCanvas()
    await editor.canvas.drawRect(300, 300, 200, 100)
    const fillItem = propertyItems(editor.page, 'fills').first()
    const hex = fillItem.getByRole('textbox', { name: 'Fill', exact: true })
    await hex.fill(color)
    await hex.press('Enter')
    const alpha = fillItem.getByRole('spinbutton', { name: 'Opacity', exact: true })
    await alpha.dblclick()
    await alpha.fill(String(opacity))
    await alpha.press('Enter')
    const swatch = fillItem.getByTestId('fill-picker-swatch')
    await swatch.click()
    await editor.page.getByTestId('fill-picker-tab-gradient').click()
    await editor.page.keyboard.press('Escape')
    const gradient = expectDefined(await getSelectedNode(editor.page), 'converted gradient')
    expect(gradient.fills[0]).toMatchObject({
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
      ]
    })
    const [top, bottom] = await readScenePixels(editor.page, [
      { x: 400, y: 310 },
      { x: 400, y: 390 }
    ])
    expect(top[0]).toBeGreaterThan(200)
    expect(bottom[0]).toBeLessThan(55)
    expect(top[3]).toBe(255)
    expect(bottom[3]).toBe(255)
    await swatch.click()
    await editor.page.getByTestId('fill-picker-tab-solid').click()
    await editor.page.keyboard.press('Escape')
    expect((await getSelectedNode(editor.page))?.fills[0]).toMatchObject({
      type: 'SOLID',
      opacity: 1,
      color: { r: 217 / 255, g: 217 / 255, b: 217 / 255, a: 1 }
    })
    await editor.canvas.undo()
    expect((await getSelectedNode(editor.page))?.fills[0]?.type).toBe('GRADIENT_LINEAR')
    editor.canvas.assertNoErrors()
  })
}
