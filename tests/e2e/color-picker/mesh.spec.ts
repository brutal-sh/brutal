import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { meshDriver } from '#tests/helpers/canvas/mesh/driver'
import { propertyItems } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear('/?test&no-rulers')
const mesh = meshDriver(() => editor.page)

for (const kind of ['fills', 'strokes'] as const) {
  test(`${kind} mesh grid repeats its palette and Undo restores the original`, async () => {
    const id = await mesh.show(kind)
    const before = await mesh.paint(id, kind)
    await propertyItems(editor.page, kind)
      .first()
      .getByRole('button', { name: kind === 'fills' ? 'Fill' : 'Stroke', exact: true })
      .click()
    const popup = editor.page.getByTestId('mesh-gradient-editor')
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Grid: 2 × 2', exact: true }).click()
    await editor.page.getByRole('button', { name: '3 × 1', exact: true }).hover()
    await expect(editor.page.getByRole('status')).toHaveText('3 × 1')
    await editor.page.getByRole('button', { name: '3 × 1', exact: true }).click()
    await expect(popup.getByRole('button', { name: /^Colors \d+$/ })).toHaveCount(8)
    const changed = await mesh.paint(id, kind)
    expect(changed?.columns).toBe(4)
    expect(changed?.rows).toBe(2)
    expect(changed?.points[4].position).toEqual({ x: 0, y: 1 })
    expect(changed?.colors[7]).toEqual(before?.colors[7])
    await editor.page.keyboard.press('Escape')
    await editor.canvas.undo()
    expect(await mesh.paint(id, kind)).toEqual(before)
    editor.canvas.assertNoErrors()
  })
}

test('Shift-selected Mesh colors edit together and preserve unselected aliases through Undo', async () => {
  const id = await mesh.show()
  const variable = await mesh.bind(id, 'fills')
  const before = await mesh.paint(id)
  const bindings = await mesh.bindings(id)
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  const popup = editor.page.getByTestId('mesh-gradient-editor')
  await popup.getByRole('button', { name: 'Colors 1', exact: true }).click()
  await popup.getByRole('button', { name: 'Colors 2', exact: true }).click({ modifiers: ['Shift'] })
  await expect(popup.getByText('Selected Points', { exact: true })).toBeVisible()
  await expect(popup.getByRole('button', { name: 'Edit color', exact: true })).toHaveText('Mixed')
  await popup.getByRole('button', { name: 'Edit color', exact: true }).click()
  await editor.page.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'HEX', exact: true }).click()
  await expect(
    editor.page.getByRole('option', { name: 'HEX', exact: true, includeHidden: true })
  ).toHaveCount(0)
  const hex = editor.page.getByRole('textbox', { name: 'HEX', exact: true })
  await expect(hex).toHaveValue('000000')
  await hex.fill('112233')
  await hex.press('Tab')
  const changed = await mesh.paint(id)
  expect(changed?.colors[0]).toEqual(changed?.colors[1])
  expect(changed?.colors[2]).toEqual(before?.colors[2])
  expect(await mesh.bindings(id)).toEqual({ 'fills/0/meshGradient/colors/4': variable })
  await editor.page.keyboard.press('Escape')
  await expect(popup).toBeVisible()
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect(await mesh.paint(id)).toEqual(before)
  expect(await mesh.bindings(id)).toEqual(bindings)
  editor.canvas.assertNoErrors()
})

test('selected Mesh shuffle permutes only its subset with aliases and one Undo', async () => {
  const id = await mesh.show()
  const variable = await mesh.bind(id, 'fills')
  const before = await mesh.paint(id)
  const bindings = await mesh.bindings(id)
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  const popup = editor.page.getByTestId('mesh-gradient-editor')
  for (const index of [1, 2, 3])
    await popup
      .getByRole('button', { name: `Colors ${index}`, exact: true })
      .click({ modifiers: index === 1 ? [] : ['Shift'] })
  await editor.page.evaluate(() => {
    Object.defineProperty(crypto, 'getRandomValues', {
      configurable: true,
      value: (array: Uint32Array) => array.fill(0)
    })
  })
  try {
    await popup.getByRole('button', { name: 'Shuffle Selected Colors', exact: true }).click()
  } finally {
    await editor.page.evaluate(() => {
      Reflect.deleteProperty(crypto, 'getRandomValues')
    })
  }
  const after = await mesh.paint(id)
  expect(after?.colors.slice(0, 3)).toEqual([
    before?.colors[1],
    before?.colors[2],
    before?.colors[0]
  ])
  expect(after?.colors.slice(3)).toEqual(before?.colors.slice(3))
  expect(await mesh.bindings(id)).toEqual({
    'fills/0/meshGradient/colors/2': variable,
    'fills/0/meshGradient/colors/4': variable
  })
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect(await mesh.paint(id)).toEqual(before)
  expect(await mesh.bindings(id)).toEqual(bindings)
  editor.canvas.assertNoErrors()
})

test('canvas Shift selection stays shared with the Mesh palette without editing the document', async () => {
  const id = await mesh.show()
  const before = await mesh.paint(id)
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  const popup = editor.page.getByTestId('mesh-gradient-editor')
  await popup.getByRole('button', { name: 'Colors 1', exact: true }).click()
  await editor.page.keyboard.down('Shift')
  try {
    await editor.canvas.click(300, 240)
  } finally {
    await editor.page.keyboard.up('Shift')
  }
  await expect(popup.getByRole('button', { name: 'Colors 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(popup.getByRole('button', { name: 'Colors 5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await editor.canvas.click(300, 240)
  await expect(popup.getByRole('button', { name: 'Colors 1', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await expect(popup.getByRole('button', { name: 'Colors 5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(await mesh.paint(id)).toEqual(before)
  editor.canvas.assertNoErrors()
})

for (const reset of ['Position', 'Curve'] as const) {
  test(`Mesh Reset ${reset} changes every selected vertex and leaves the rest intact`, async () => {
    const id = await mesh.show()
    await editor.page.evaluate((id) => {
      const store = window.openPencil?.getStore?.()
      const node = store?.graph.getNode(id)
      if (!store || !node) throw new Error('Missing Mesh fixture')
      const paint = structuredClone(node.fills[0])
      if (!paint.meshGradient) throw new Error('Missing Mesh')
      paint.meshGradient.points[0] = {
        position: { x: 0.1, y: 0.2 },
        rightHandle: { x: 0.2, y: 0.1 }
      }
      paint.meshGradient.points[4] = {
        position: { x: 0.7, y: 0.8 },
        rightHandle: { x: 0.2, y: 0.1 }
      }
      paint.meshGradient.points[8].leftHandle = { x: -0.3, y: 0.1 }
      store.graph.updateNode(id, { fills: [paint] })
      store.requestRender()
    }, id)
    const before = await mesh.paint(id)
    await propertyItems(editor.page, 'fills')
      .first()
      .getByRole('button', { name: 'Fill', exact: true })
      .click()
    const popup = editor.page.getByTestId('mesh-gradient-editor')
    await popup.getByRole('button', { name: 'Colors 1', exact: true }).click()
    await popup
      .getByRole('button', { name: 'Colors 5', exact: true })
      .click({ modifiers: ['Shift'] })
    await popup.getByRole('button', { name: `Reset ${reset}`, exact: true }).click()
    const after = await mesh.paint(id)
    for (const index of [0, 4]) {
      expect(after?.points[index].position).toEqual(
        reset === 'Position'
          ? { x: index === 0 ? 0 : 0.5, y: index === 0 ? 0 : 0.5 }
          : before?.points[index].position
      )
      expect(after?.points[index].rightHandle).toEqual(
        reset === 'Curve' ? undefined : before?.points[index].rightHandle
      )
    }
    expect(after?.points[8]).toEqual(before?.points[8])
    expect(after?.colors).toEqual(before?.colors)
    await editor.page.keyboard.press('Escape')
    await editor.canvas.undo()
    expect(await mesh.paint(id)).toEqual(before)
    editor.canvas.assertNoErrors()
  })
}

test('mesh canvas drag keeps the picker open and Undo restores the point', async () => {
  const id = await mesh.show()
  const before = await mesh.paint(id)
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  const popup = editor.page.getByTestId('mesh-gradient-editor')
  await editor.canvas.drag(300, 240, 340, 280)
  await expect(popup).toBeVisible()
  const changed = await mesh.paint(id)
  expect(changed?.points[4].position.x).toBeCloseTo(0.6, 2)
  expect(changed?.points[4].position.y).toBeCloseTo(0.642857, 2)
  await expect(popup.getByRole('button', { name: 'Colors 5', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await popup.getByRole('button', { name: 'Independent handles', exact: true }).click()
  await popup.getByRole('button', { name: 'Off', exact: true }).click()
  const options = await editor.page.evaluate(() => {
    const edit = window.openPencil?.getStore?.().state.gradientEdit
    return { mirrored: edit?.meshMirrored, outline: edit?.meshOutline }
  })
  expect(options).toEqual({ mirrored: false, outline: false })
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect(await mesh.paint(id)).toEqual(before)
  editor.canvas.assertNoErrors()
})

test('the Gradient menu converts a paint to Mesh and back to a linear gradient', async () => {
  await editor.canvas.drawRect(300, 300, 120, 80)
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  const popup = editor.page.locator('[data-picker-content]')
  await popup.getByRole('button', { name: 'Gradient', exact: true }).click()
  await popup.getByRole('combobox').last().click()
  await editor.page.getByRole('option', { name: 'Mesh', exact: true }).click()
  await expect(editor.page.getByTestId('mesh-gradient-editor')).toBeVisible()
  await editor.page
    .getByTestId('mesh-gradient-editor')
    .getByRole('button', { name: 'Colors 5', exact: true })
    .click()
  await popup.getByRole('combobox').last().click()
  await editor.page.getByRole('option', { name: 'Linear', exact: true }).click()
  await expect(editor.page.getByTestId('fill-picker-gradient-bar')).toBeVisible()
  await popup.getByRole('combobox').last().click()
  await editor.page.getByRole('option', { name: 'Mesh', exact: true }).click()
  await expect(
    editor.page.getByTestId('mesh-gradient-editor').getByText('Selected Point', { exact: true })
  ).toHaveCount(0)
  await editor.page.keyboard.press('Escape')
  editor.canvas.assertNoErrors()
})

for (const kind of ['fills', 'strokes'] as const) {
  test(`${kind} vertex aliases survive resize Undo and detach on color edit or conversion`, async () => {
    const id = await mesh.show(kind)
    const variable = await mesh.bind(id, kind)
    const original = await mesh.bindings(id)
    const trigger = propertyItems(editor.page, kind)
      .first()
      .getByRole('button', { name: kind === 'fills' ? 'Fill' : 'Stroke', exact: true })
    await trigger.click()
    const popup = editor.page.getByTestId('mesh-gradient-editor')
    await popup.getByRole('button', { name: 'Grid: 2 × 2', exact: true }).click()
    await editor.page.getByRole('button', { name: '1 × 1', exact: true }).click()
    expect(await mesh.bindings(id)).toEqual({ [`${kind}/0/meshGradient/colors/0`]: variable })
    await editor.page.keyboard.press('Escape')
    await editor.canvas.undo()
    expect(await mesh.bindings(id)).toEqual(original)

    await trigger.click()
    await popup.getByRole('button', { name: 'Colors 1', exact: true }).click()
    await popup.getByRole('button', { name: 'Edit color', exact: true }).click()
    await editor.page.getByTestId('color-format-select').click()
    await editor.page.getByRole('option', { name: 'HEX', exact: true }).click()
    await expect(
      editor.page.getByRole('option', { name: 'HEX', exact: true, includeHidden: true })
    ).toHaveCount(0)
    const hex = editor.page.getByRole('textbox', { name: 'HEX', exact: true })
    await hex.fill('112233')
    await hex.press('Tab')
    expect(await mesh.bindings(id)).toEqual({ [`${kind}/0/meshGradient/colors/4`]: variable })
    await expect(popup).toBeVisible()
    await editor.page.keyboard.press('Escape')
    await expect(popup).toBeVisible()
    await editor.page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
    await editor.canvas.undo()
    expect(await mesh.bindings(id)).toEqual(original)

    await trigger.click()
    await editor.page
      .locator('[data-picker-content]')
      .getByRole('button', { name: 'Color', exact: true })
      .click()
    expect(await mesh.bindings(id)).toEqual({})
    await editor.page.keyboard.press('Escape')
    await editor.canvas.undo()
    expect(await mesh.bindings(id)).toEqual(original)
    editor.canvas.assertNoErrors()
  })
}
