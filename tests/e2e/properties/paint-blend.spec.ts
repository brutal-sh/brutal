import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertyItems, propertySection } from '#tests/helpers/properties'
import { getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetupWithClear()

for (const kind of ['fills', 'strokes'] as const) {
  test(`${kind} blend popup preserves color bindings and geometry through Undo`, async () => {
    await editor.canvas.drawRect(300, 300, 100, 80)
    if (kind === 'strokes')
      await propertySection(editor.page, 'Stroke')
        .getByRole('button', { name: 'Add stroke' })
        .click()
    const binding = await editor.page.evaluate((kind) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      const id = [...store.state.selectedIds][0]
      if (!id) throw new Error('No selected layer')
      const collection = store.graph.createCollection('Paint colors')
      const variable = store.graph.createVariable('paint-brand', 'COLOR', collection.id, {
        r: 0.8,
        g: 0.2,
        b: 0.4,
        a: 1
      })
      store.graph.bindVariable(id, `${kind}/0/color`, variable.id)
      store.requestRender()
      return variable.id
    }, kind)
    const before = await getSelectedNode(editor.page)
    if (!before) throw new Error('No selected layer')
    const readBinding = () =>
      editor.page.evaluate((kind) => {
        const store = window.openPencil?.getStore?.()
        const id = store && [...store.state.selectedIds][0]
        return id ? store?.getNode(id)?.boundVariables[`${kind}/0/color`] : undefined
      }, kind)
    const row = propertyItems(editor.page, kind).first()
    await expect(row.getByRole('spinbutton', { name: 'Opacity', exact: true })).toHaveCount(0)
    await expect(row.locator('[data-slot="pill"]')).toContainText('paint-brand')
    await row.getByRole('button', { name: 'Apply variable', exact: true }).click()
    await editor.page.getByRole('button', { name: 'Detach variable', exact: true }).click()
    await expect(row.getByRole('spinbutton', { name: 'Opacity', exact: true })).toBeVisible()
    expect(
      await row
        .locator('[data-property="opacity"]')
        .evaluate((field) =>
          [...field.querySelectorAll('span')].every((span) => span.scrollWidth <= span.clientWidth)
        )
    ).toBe(true)
    const hex = row.locator('[data-property="color-hex"]')
    expect(await hex.evaluate((input) => input.scrollWidth <= input.clientWidth)).toBe(true)
    await editor.canvas.undo()
    await expect(row.locator('[data-slot="pill"]')).toContainText('paint-brand')
    await propertyItems(editor.page, kind).first().getByTestId('fill-picker-swatch').click()
    const popup = editor.page.locator('[data-picker-content]')
    await popup.getByRole('combobox', { name: 'Blend mode' }).click()
    await editor.page.getByRole('option', { name: 'Multiply', exact: true }).click()
    await expect(popup).toBeVisible()
    expect((await getSelectedNode(editor.page))?.[kind][0]).toMatchObject({
      ...before[kind][0],
      blendMode: 'MULTIPLY'
    })
    expect(await readBinding()).toBe(binding)
    expect(await getSelectedNode(editor.page)).toMatchObject({
      x: before.x,
      y: before.y,
      width: before.width,
      height: before.height
    })
    await editor.page.keyboard.press('Escape')
    await editor.canvas.undo()
    expect((await getSelectedNode(editor.page))?.[kind]).toEqual(before[kind])
    expect(await readBinding()).toBe(binding)
    editor.canvas.assertNoErrors()
  })
}
