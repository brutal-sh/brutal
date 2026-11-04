import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertyField } from '#tests/helpers/properties'
import { getNodeById, getPageChildren, getSelectedNode } from '#tests/helpers/store'
import { toolbarFlyoutTestId, toolbarToolTestId } from '#tests/helpers/test-ids'

const ctx = useEditorSetupWithClear()
test.beforeAll(async () => {
  await ctx.page.route('https://api.iconify.design/lucide.json*', (route) =>
    route.fulfill({
      json: {
        prefix: 'lucide',
        width: 24,
        height: 24,
        icons: { heart: { body: '<path fill="none" stroke="currentColor" d="M2 8L12 20L22 8Z"/>' } }
      }
    })
  )
})

async function arm() {
  await ctx.page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  await ctx.page.getByRole('menuitemradio', { name: 'Icon', exact: true }).click()
  await expect(ctx.page.getByTestId(toolbarToolTestId('ICON'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
}

test('Icon arms without editing, places once, remembers the choice and restores its subtree through history', async () => {
  const { page, canvas } = ctx
  await arm()
  expect(await getPageChildren(page)).toHaveLength(0)
  await expect(page.getByRole('dialog', { name: 'Insert icon' })).toBeHidden()
  await canvas.click(350, 250)
  await expect.poll(async () => (await getSelectedNode(page))?.name).toBe('Icon')
  const icon = await getSelectedNode(page)
  expect(icon).toMatchObject({ type: 'FRAME', width: 24, height: 24 })
  const childId = icon?.childIds[0]
  if (!childId) throw new Error('Placed icon has no vector')
  expect((await getNodeById(page, childId))?.strokes[0]?.color).toEqual({ r: 1, g: 1, b: 1, a: 1 })
  await expect(propertyField(page, 'icon-name')).toContainText('heart')
  await expect(page.getByTestId(toolbarToolTestId('SELECT'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  await expect(page.getByRole('menuitemradio', { name: 'Icon', exact: true })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('[role="menu"]')).toHaveCount(0)
  await canvas.undo()
  expect(await getPageChildren(page)).toHaveLength(0)
  await canvas.redo()
  expect(await getPageChildren(page)).toHaveLength(1)
  expect(await getNodeById(page, childId)).not.toBeNull()
  canvas.assertNoErrors()
})

test('Escape cancels armed placement, and a click inside a frame uses that frame', async () => {
  const { page, canvas } = ctx
  await arm()
  await canvas.pressKey('Escape')
  await canvas.click(350, 250)
  expect(await getPageChildren(page)).toHaveLength(0)
  await canvas.pressKey('f')
  await canvas.drag(250, 180, 500, 400)
  const parent = await getSelectedNode(page)
  if (!parent) throw new Error('Frame was not drawn')
  await arm()
  await canvas.click(300, 230)
  await expect.poll(async () => (await getSelectedNode(page))?.name).toBe('Icon')
  const icon = await getSelectedNode(page)
  if (!icon) throw new Error('Icon was not placed')
  expect((await getNodeById(page, parent.id))?.childIds).toContain(icon.id)
  expect(icon).toMatchObject({ y: 38, width: 24, height: 24 })
  // The browser's mouse delivery can differ by a pixel from a fractional canvas edge.
  expect(Math.abs(icon.x - 38)).toBeLessThan(1)
  expect(await getPageChildren(page)).toHaveLength(1)
  await canvas.undo()
  expect((await getNodeById(page, parent.id))?.childIds).toHaveLength(0)
  canvas.assertNoErrors()
})
