import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertySection } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetupWithClear()

function readEffects() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const id = store && [...store.state.selectedIds][0]
    const node = id ? store?.graph.getNode(id) : undefined
    if (!node) throw new Error('No selected effect layer')
    return node.effects
  })
}

test('compact effect chooser opens settings, edits, dismisses and restores through Undo', async () => {
  await editor.canvas.drawRect(300, 300, 100, 80)
  const section = propertySection(editor.page, 'Effects')
  await section.getByRole('combobox', { name: 'Add effect', exact: true }).click()
  await expect(editor.page.getByRole('option')).toHaveText([
    'Drop Shadow',
    'Inner Shadow',
    'Layer Blur',
    'Background Blur'
  ])
  await editor.page.getByRole('option', { name: 'Drop Shadow', exact: true }).click()
  const popup = editor.page.locator('[data-effect-popup]')
  await expect(popup).toBeVisible()
  expect((await readEffects())[0]).toMatchObject({
    type: 'DROP_SHADOW',
    radius: 4,
    offset: { x: 0, y: 4 },
    color: { r: 0, g: 0, b: 0, a: 0.25 }
  })
  await expect(popup.getByRole('spinbutton', { name: 'Blur', exact: true })).toContainText('4')
  const blur = popup.getByRole('spinbutton', { name: 'Blur', exact: true })
  await blur.focus()
  await blur.fill('16')
  await blur.press('Enter')
  await popup.getByRole('combobox', { name: 'Blend mode' }).click()
  await editor.page.getByRole('option', { name: 'Multiply', exact: true }).click()
  await expect(popup).toBeVisible()
  await editor.page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  expect((await readEffects())[0]).toMatchObject({
    radius: 16,
    blendMode: 'MULTIPLY'
  })
  await editor.canvas.undo()
  expect((await readEffects())[0].blendMode).toBeUndefined()
  await editor.canvas.undo()
  expect((await readEffects())[0].radius).toBe(4)
  await section.getByRole('button', { name: 'Drop Shadow', exact: true }).click()
  await popup.getByRole('combobox', { name: 'Effects', exact: true }).click()
  await editor.page.getByRole('option', { name: 'Layer Blur', exact: true }).click()
  await expect(popup.getByRole('textbox', { name: 'Color', exact: true })).toHaveCount(0)
  expect((await readEffects())[0]).toMatchObject({
    type: 'LAYER_BLUR',
    offset: { x: 0, y: 0 },
    radius: 4
  })
  await editor.page.keyboard.press('Escape')
  await section.getByRole('button', { name: 'Remove effect', exact: true }).click()
  expect(await readEffects()).toEqual([])
  editor.canvas.assertNoErrors()
})

test('each compact blur/shadow choice adds its own effect', async () => {
  await editor.canvas.drawRect(300, 300, 100, 80)
  const section = propertySection(editor.page, 'Effects')
  for (const name of ['Inner Shadow', 'Layer Blur', 'Background Blur']) {
    await section.getByRole('combobox', { name: 'Add effect', exact: true }).click()
    await editor.page.getByRole('option', { name, exact: true }).click()
    const popup = editor.page.locator('[data-effect-popup]')
    await expect(popup).toBeVisible()
    await expect(popup.getByRole('combobox', { name: 'Effects', exact: true })).toContainText(name)
    await editor.page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
  }
  expect((await readEffects()).map((effect) => effect.type)).toEqual([
    'INNER_SHADOW',
    'LAYER_BLUR',
    'BACKGROUND_BLUR'
  ])
  await expect(section.getByRole('button').filter({ hasText: /Shadow|Blur/ })).toHaveText([
    'Background Blur',
    'Layer Blur',
    'Inner Shadow'
  ])
  await section.getByRole('combobox', { name: 'Add effect', exact: true }).click()
  await expect(
    editor.page.getByRole('option', { name: 'Layer Blur', exact: true })
  ).toHaveAttribute('aria-disabled', 'true')
  await expect(
    editor.page.getByRole('option', { name: 'Background Blur', exact: true })
  ).toHaveAttribute('aria-disabled', 'true')
  await editor.page.keyboard.press('Escape')
  await expect(editor.page.getByRole('option', { name: 'Layer Blur', exact: true })).toHaveCount(0)
  await editor.canvas.undo()
  expect((await readEffects()).map((effect) => effect.type)).toEqual(['INNER_SHADOW', 'LAYER_BLUR'])
  editor.canvas.assertNoErrors()
})

test('compact shadow color and nested Escape retain edits without moving the layer', async () => {
  await editor.canvas.drawRect(300, 300, 100, 80)
  const before = await getSelectedNode(editor.page)
  if (!before) throw new Error('No shadow layer')
  const section = propertySection(editor.page, 'Effects')
  await section.getByRole('combobox', { name: 'Add effect', exact: true }).click()
  await editor.page.getByRole('option', { name: 'Drop Shadow', exact: true }).click()
  const popup = editor.page.locator('[data-effect-popup]')
  await expect(popup).toBeVisible()
  await expect(popup).toHaveCSS('width', '264px')
  const color = popup.getByRole('textbox', { name: 'Color', exact: true })
  await color.fill('336699')
  await color.press('Tab')
  await popup.getByRole('button', { name: 'Edit color', exact: true }).click()
  const nested = editor.page.locator('[data-picker-content]')
  await nested.getByTestId('color-format-select').click()
  await editor.page.getByRole('option', { name: 'HEX', exact: true }).click()
  const hex = nested.getByRole('textbox', { name: 'HEX', exact: true })
  await hex.fill('00FF00')
  await hex.press('Shift+Tab')
  await editor.page.keyboard.press('Escape')
  await expect(nested).toHaveCount(0)
  await expect(popup).toBeVisible()
  await expect(color).toHaveValue('00FF00')
  expect((await readEffects())[0].color).toEqual({ r: 0, g: 1, b: 0, a: 0.25 })
  expect(await getSelectedNode(editor.page)).toMatchObject({ x: before.x, y: before.y })
  await editor.page.mouse.move(0, 0)
  await expect(popup).toHaveScreenshot('compact-shadow-popup.png', { maxDiffPixelRatio: 0 })
  await editor.page.keyboard.press('Escape')
  await editor.canvas.undo()
  expect((await readEffects())[0].color).toEqual({ r: 0.2, g: 0.4, b: 0.6, a: 0.25 })
  editor.canvas.assertNoErrors()
})
