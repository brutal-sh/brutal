import { expect, test, useIsolatedEditorSetupWithClear } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { propertyField } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useIsolatedEditorSetupWithClear('/', mockOfficialCloudDiscovery)

function xField() {
  return propertyField(editor.page, 'x')
}

async function editField(field: ReturnType<typeof xField>) {
  await field.click()
  return field.getByRole('spinbutton', { name: 'X Axis' })
}

async function numericFieldValue(field: ReturnType<typeof xField>): Promise<number> {
  return Number(expectDefined(await field.getAttribute('aria-valuenow'), 'field value'))
}

test.beforeEach(async () => {
  await editor.canvas.clearCanvas()
  await editor.canvas.drawRect(120, 100, 80, 80)
})

test('NumberField evaluates absolute arithmetic and preserves signed entry', async () => {
  const field = xField()
  const before = await numericFieldValue(field)

  let input = await editField(field)
  await expect(field).not.toHaveAttribute('role')
  await expect(input).toHaveAttribute('role', 'spinbutton')
  await expect(input).toHaveAttribute('aria-label', 'X Axis')
  await expect(field.getByRole('spinbutton')).toHaveCount(1)
  await input.fill('*2')
  await input.press('Enter')
  await editor.canvas.waitForRender()
  expect((await getSelectedNode(editor.page))?.x).toBe(before)

  input = await editField(field)
  await input.fill('+10')
  await input.press('Enter')
  await editor.canvas.waitForRender()
  expect((await getSelectedNode(editor.page))?.x).toBe(10)
  await expect(field).toHaveAttribute('aria-valuenow', '10')
  input = await editField(field)
  await input.fill('12+2')
  await input.press('Enter')
  expect((await getSelectedNode(editor.page))?.x).toBe(14)
  input = await editField(field)
  await input.fill('-4')
  await input.press('ArrowUp')
  await input.press('Enter')
  expect((await getSelectedNode(editor.page))?.x).toBe(-3)
  input = await editField(field)
  await input.press('Enter')
  expect((await getSelectedNode(editor.page))?.x).toBe(-3)
  editor.canvas.assertNoErrors()
})

test('NumberField invalid input and Escape restore the previous value', async () => {
  const field = xField()
  // Cancellation restores the exact graph coordinate, not its rounded display value.
  const before = expectDefined((await getSelectedNode(editor.page))?.x, 'original x')

  let input = await editField(field)
  await input.fill('77')
  await editor.canvas.waitForRender()
  expect((await getSelectedNode(editor.page))?.x).toBe(77)
  await input.press('Escape')
  await editor.canvas.waitForRender()
  expect((await getSelectedNode(editor.page))?.x).toBe(before)

  input = await editField(field)
  await input.fill('constructor')
  await input.press('Enter')
  await editor.canvas.waitForRender()
  expect((await getSelectedNode(editor.page))?.x).toBe(before)
  await expect(field).not.toHaveAttribute('data-editing')
  editor.canvas.assertNoErrors()
})

test('NumberField Arrow keys honor Shift and Alt multipliers', async () => {
  const field = xField()
  const before = await numericFieldValue(field)
  const input = await editField(field)

  await input.press('ArrowUp')
  await input.press('Shift+ArrowUp')
  await input.press('Alt+ArrowDown')
  await input.press('Enter')
  await editor.canvas.waitForRender()

  expect((await getSelectedNode(editor.page))?.x).toBe(before + 10.9)
  editor.canvas.assertNoErrors()
})

test('Escape cancels a pointer scrub without clearing the selected layer', async () => {
  const field = xField()
  const before = expectDefined(await getSelectedNode(editor.page), 'selected layer')
  const bounds = expectDefined(await field.boundingBox(), 'X field bounds')
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  await editor.page.mouse.move(x, y)
  await editor.page.mouse.down()
  await editor.page.mouse.move(x + 35, y)
  await expect(field).toHaveAttribute('data-scrubbing')
  expect((await getSelectedNode(editor.page))?.x).not.toBe(before.x)
  await editor.page.keyboard.press('Escape')
  await editor.page.mouse.up()
  const after = await getSelectedNode(editor.page)
  expect(after?.id).toBe(before.id)
  expect(after?.x).toBe(before.x)
  editor.canvas.assertNoErrors()
})

test('mixed numeric edits cancel per-node values and commit zero in one undo step', async () => {
  await editor.canvas.drawRect(300, 100, 80, 80)
  await editor.canvas.selectAll()
  const values = () =>
    editor.page.evaluate(() =>
      window.openPencil
        ?.getStore?.()
        .getSelectedNodes()
        .map((node) => node.x)
    )
  const original = await values()
  let input = await editField(xField())
  await input.fill('77')
  expect(await values()).toEqual([77, 77])
  await input.press('Escape')
  expect(await values()).toEqual(original)
  input = await editField(xField())
  await input.fill('0')
  await input.press('Enter')
  expect(await values()).toEqual([0, 0])
  await editor.page.evaluate(() => window.openPencil?.getStore?.().undoAction())
  expect(await values()).toEqual(original)
})

test('NumberField exposes mixed state through canonical data attributes', async () => {
  await editor.canvas.drawRect(300, 100, 80, 80)
  await editor.canvas.selectAll()
  await editor.canvas.waitForRender()

  await expect(xField()).toHaveAttribute('data-mixed')
  await expect(xField()).not.toHaveAttribute('aria-valuenow')
  editor.canvas.assertNoErrors()
})
