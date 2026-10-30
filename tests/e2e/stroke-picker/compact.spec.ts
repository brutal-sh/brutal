import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear()

function state() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const id = store && [...store.state.selectedIds][0]
    const node = id && store?.graph.getNode(id)
    if (!node) throw new Error('No selected stroke layer')
    return {
      x: node.x,
      y: node.y,
      independent: node.independentStrokeWeights,
      sides: [
        node.borderTopWeight,
        node.borderRightWeight,
        node.borderBottomWeight,
        node.borderLeftWeight
      ],
      cap: node.strokeCap,
      join: node.strokeJoin,
      strokes: node.strokes
    }
  })
}

test('compact stroke menus and common/independent weights edit the same geometry and Undo', async () => {
  await editor.canvas.drawRect(300, 300, 100, 80)
  const section = propertySection(editor.page, 'Stroke')
  await section.getByRole('button', { name: 'Add stroke' }).click()
  await expect(section.getByRole('button', { name: 'Stroke settings' })).toHaveCount(0)
  await section.getByRole('combobox', { name: 'Stroke type' }).click()
  await editor.page.getByRole('option', { name: 'Inside', exact: true }).click()
  const weight = section.getByRole('spinbutton', { name: 'Stroke weight', exact: true })
  await weight.focus()
  await weight.fill('12')
  await weight.press('Enter')
  await section.getByRole('button', { name: 'Stroke sides' }).click()
  for (const side of ['left', 'top', 'right', 'bottom'])
    await expect(
      section.getByRole('spinbutton', { name: `Stroke weight ${side}`, exact: true })
    ).toContainText('12')
  await section.getByRole('combobox', { name: 'Stroke join' }).click()
  await editor.page.getByRole('option', { name: 'Round', exact: true }).click()
  await section.getByRole('combobox', { name: 'Stroke cap' }).click()
  await editor.page.getByRole('option', { name: 'Square', exact: true }).click()
  expect(await state()).toMatchObject({ cap: 'SQUARE', join: 'ROUND', independent: false })
  await editor.canvas.undo()
  await editor.canvas.undo()
  expect(await state()).toMatchObject({ cap: 'NONE', join: 'MITER' })
  const left = section.getByRole('spinbutton', { name: 'Stroke weight left', exact: true })
  await left.focus()
  await left.fill('5')
  await left.press('Enter')
  expect(await state()).toMatchObject({ independent: true, sides: [12, 12, 12, 5] })
  await expect(weight).toContainText('Mixed')
  await expect(weight).toHaveAttribute('aria-valuetext', 'Mixed')
  await section.getByRole('button', { name: 'Stroke sides' }).click()
  await expect(left).toHaveCount(0)
  expect(await state()).toMatchObject({ independent: true, sides: [12, 12, 12, 5] })
  await expect(weight).toContainText('Mixed')
  await section.getByRole('button', { name: 'Stroke sides' }).click()
  await expect(left).toBeVisible()
  await weight.focus()
  await weight.fill('20')
  await weight.press('Enter')
  expect(await state()).toMatchObject({ independent: true, sides: [20, 20, 20, 20] })
  expect((await state()).strokes[0]).toMatchObject({ weight: 20, align: 'INSIDE' })
  await editor.canvas.undo()
  expect(await state()).toMatchObject({ independent: true, sides: [12, 12, 12, 5] })
  await editor.canvas.undo()
  expect(await state()).toMatchObject({ independent: false })
  await expect(left).toBeVisible()
  editor.canvas.assertNoErrors()
})

test('authored independent strokes start collapsed with Mixed and reveal their saved sides', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      x: 300,
      y: 300,
      width: 100,
      height: 80,
      independentStrokeWeights: true,
      borderTopWeight: 5,
      borderRightWeight: 10,
      borderBottomWeight: 15,
      borderLeftWeight: 20,
      strokes: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          weight: 20,
          align: 'INSIDE'
        }
      ]
    })
    store.select([node.id])
  })
  const section = propertySection(editor.page, 'Stroke')
  await expect(
    section.getByRole('spinbutton', { name: 'Stroke weight', exact: true })
  ).toContainText('Mixed')
  await expect(
    section.getByRole('spinbutton', { name: 'Stroke weight left', exact: true })
  ).toHaveCount(0)
  await section.getByRole('button', { name: 'Stroke sides' }).click()
  await expect(
    section.getByRole('spinbutton', { name: 'Stroke weight left', exact: true })
  ).toContainText('20')
  expect(await state()).toMatchObject({ independent: true, sides: [5, 10, 15, 20] })
  editor.canvas.assertNoErrors()
})
