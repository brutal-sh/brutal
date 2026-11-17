import type { Color } from '@open-pencil/scene-graph/primitives'

import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { fillDriver } from '#tests/helpers/canvas/fill-driver'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { openAdvancedProperties, propertyItems } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useIsolatedEditorSetupWithClear('/', mockOfficialCloudDiscovery)
const alpha = 0.123456
const cases = [
  {
    name: 'Hue',
    format: 'HSL',
    id: 'color-slider-hue',
    expression: '105*2',
    original: { r: 0.2, g: 0.399, b: 0.6, a: alpha },
    expected: { r: 0.2, g: 0.4, b: 0.6, a: alpha }
  },
  {
    name: 'Saturation',
    format: 'HSL',
    id: 'color-slider-hsl-s',
    expression: '25*2',
    original: { r: 0.201, g: 0.4, b: 0.599, a: alpha },
    expected: { r: 0.2, g: 0.4, b: 0.6, a: alpha }
  },
  {
    name: 'Lightness',
    format: 'HSL',
    id: 'color-slider-hsl-l',
    expression: '20*2',
    original: { r: 0.201, g: 0.402, b: 0.603, a: alpha },
    expected: { r: 0.2, g: 0.4, b: 0.6, a: alpha }
  },
  {
    name: 'Saturation',
    format: 'HSB',
    id: 'color-slider-hsb-s',
    expression: '25*2',
    original: { r: 0.301, g: 0.4505, b: 0.6, a: alpha },
    expected: { r: 0.3, g: 0.45, b: 0.6, a: alpha }
  },
  {
    name: 'Brightness',
    format: 'HSB',
    id: 'color-slider-hsb-b',
    expression: '30*2',
    original: { r: 0.2001, g: 0.4002, b: 0.6003, a: alpha },
    expected: { r: 0.2, g: 0.4, b: 0.6, a: alpha }
  }
]

test.beforeEach(async () => {
  await editor.canvas.drawRect(180, 140, 160, 120)
})

async function openChannel(item: (typeof cases)[number]) {
  const page = editor.page
  await page.evaluate((color) => {
    const store = window.openPencil?.getStore?.()
    const node = store?.getSelectedNodes()[0]
    if (!store || !node?.fills[0]) throw new Error('Missing channel slider fixture')
    store.updateNode(node.id, { fills: [{ ...node.fills[0], color }] })
  }, item.original)
  await fillDriver(() => page).clearHistory()
  await openAdvancedProperties(page)
  await propertyItems(page, 'fills').first().getByTestId('fill-picker-swatch').click()
  await page.getByTestId('color-format-select').click()
  await page.getByRole('option', { name: item.format, exact: true }).click()
  const field = page.getByTestId(item.id).getByRole('spinbutton', { name: item.name, exact: true })
  await expect(field).toBeVisible()
  expect((await getSelectedNode(page))?.fills[0].color).toEqual(item.original)
  return field
}

function expectColor(actual: Color | undefined, expected: Color) {
  expect(actual?.r).toBeCloseTo(expected.r, 12)
  expect(actual?.g).toBeCloseTo(expected.g, 12)
  expect(actual?.b).toBeCloseTo(expected.b, 12)
  expect(actual?.a).toBe(expected.a)
}

for (const item of cases) {
  test(`${item.format} ${item.name} slider commits an explicit result equal to its rounded display`, async () => {
    const field = await openChannel(item)
    await field.focus()
    await field.fill(item.expression)
    await field.press('Enter')
    const color = (await getSelectedNode(editor.page))?.fills[0].color
    expect(color).not.toEqual(item.original)
    expectColor(color, item.expected)
    editor.canvas.assertNoErrors()
  })

  test(`${item.format} ${item.name} slider cancellation restores the complete original color`, async () => {
    const field = await openChannel(item)
    await field.focus()
    await field.fill('77')
    expect((await getSelectedNode(editor.page))?.fills[0].color).not.toEqual(item.original)
    await field.press('Escape')
    expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual(item.original)
    editor.canvas.assertNoErrors()
  })

  test(`untouched ${item.format} ${item.name} slider preserves the complete fractional color`, async () => {
    const field = await openChannel(item)
    await field.focus()
    await field.press('Enter')
    expect((await getSelectedNode(editor.page))?.fills[0].color).toEqual(item.original)
    editor.canvas.assertNoErrors()
  })

  test(`${item.format} ${item.name} slider retains invalid values and supports closed-picker history`, async ({
    page
  }, info) => {
    const field = await openChannel(item)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-picker-content]')).toHaveCount(0)
    await fillDriver(() => page).clearHistory()
    await propertyItems(page, 'fills').first().getByTestId('fill-picker-swatch').click()
    await field.focus()
    await field.fill(item.expression)
    await field.press('Enter')
    expectColor((await getSelectedNode(page))?.fills[0].color, item.expected)
    await info.attach('channel-slider-picker', {
      body: await page.locator('[data-picker-content]').screenshot({ animations: 'disabled' }),
      contentType: 'image/png'
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-picker-content]')).toHaveCount(0)
    await editor.canvas.undo()
    expect((await getSelectedNode(page))?.fills[0].color).toEqual(item.original)
    await editor.canvas.redo()
    const committed = (await getSelectedNode(page))?.fills[0].color
    expectColor(committed, item.expected)
    await propertyItems(page, 'fills').first().getByTestId('fill-picker-swatch').click()
    for (const invalid of ['1+', '1/0']) {
      await field.focus()
      await field.fill(invalid)
      await field.press('Enter')
      expect((await getSelectedNode(page))?.fills[0].color).toEqual(committed)
    }
    editor.canvas.assertNoErrors()
  })
}
