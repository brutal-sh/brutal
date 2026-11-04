import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { getPageChildren } from '#tests/helpers/store'
import {
  toolbarFlyoutItemTestId,
  toolbarFlyoutTestId,
  toolbarToolTestId
} from '#tests/helpers/test-ids'

const editor = useEditorSetup()

test('shapes flyout opens', async () => {
  await editor.page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  const rectangleItem = editor.page.getByTestId(toolbarFlyoutItemTestId('RECTANGLE'))
  const polygonItem = editor.page.getByTestId(toolbarFlyoutItemTestId('POLYGON'))

  await expect(polygonItem).toBeVisible()
  await expect(rectangleItem).toHaveAttribute('data-active', 'true')
  await expect(rectangleItem).toHaveAttribute('role', 'menuitemradio')
  await expect(rectangleItem).toHaveAttribute('aria-checked', 'true')
  await expect(rectangleItem.locator('[data-slot="flyout-item-indicator"] svg')).toHaveCount(1)
  await expect(polygonItem).not.toHaveAttribute('data-active', 'true')
  await expect(polygonItem).toHaveAttribute('aria-checked', 'false')
  editor.canvas.assertNoErrors()
})

test('Polygon tool creates POLYGON node', async () => {
  await editor.page.getByTestId(toolbarFlyoutItemTestId('POLYGON')).click()
  await expect(editor.page.getByTestId(toolbarToolTestId('POLYGON'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await editor.canvas.drag(300, 200, 400, 300)
  await editor.canvas.waitForRender()

  const children = await getPageChildren(editor.page)
  expect(children.some((n) => n.type === 'POLYGON')).toBe(true)
  editor.canvas.assertNoErrors()
})

test('a hidden Star tool can be restored and creates STAR nodes', async () => {
  await editor.page.getByTestId('toolbar').click({ button: 'right' })
  await editor.page.getByRole('menuitem', { name: 'Customize toolbar…' }).click()
  const settings = editor.page.getByTestId('settings-toolbar-panel')
  await settings.getByRole('switch', { name: 'Show Star', exact: true }).click()
  await editor.page.getByTestId('app-settings-done').click()
  await expect(editor.page.getByTestId('app-settings-dialog')).toBeHidden()
  await editor.page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  await editor.page.getByTestId(toolbarFlyoutItemTestId('STAR')).click()
  await editor.canvas.drag(150, 150, 250, 250)
  await editor.canvas.waitForRender()

  const children = await getPageChildren(editor.page)
  expect(children.some((n) => n.type === 'STAR')).toBe(true)
  editor.canvas.assertNoErrors()
})

test('shape flyout remembers its selection independently of the active tool', async () => {
  await editor.canvas.pressKey('f')
  await expect(editor.page.getByTestId(toolbarToolTestId('STAR'))).toHaveAttribute(
    'aria-pressed',
    'false'
  )

  await editor.page.getByTestId(toolbarFlyoutTestId('RECTANGLE')).click()
  const starItem = editor.page.getByTestId(toolbarFlyoutItemTestId('STAR'))
  const rectangleItem = editor.page.getByTestId(toolbarFlyoutItemTestId('RECTANGLE'))

  await expect(starItem).toHaveAttribute('data-active', 'true')
  await expect(starItem).toHaveAttribute('aria-checked', 'true')
  await expect(starItem).toBeFocused()
  await expect(starItem.locator('[data-slot="flyout-item-indicator"] svg')).toHaveCount(1)
  await expect(rectangleItem).not.toHaveAttribute('data-active', 'true')
  await expect(rectangleItem).toHaveAttribute('aria-checked', 'false')

  await rectangleItem.hover()
  await expect(rectangleItem).toHaveAttribute('data-highlighted', '')
  await expect(starItem).toHaveAttribute('data-active', 'true')
  editor.canvas.assertNoErrors()
})

test('Pen creates VECTOR node with 3 vertices on Enter', async () => {
  await editor.canvas.pressKey('Escape')
  await editor.canvas.pressKey('p')
  await editor.canvas.click(100, 400)
  await editor.canvas.waitForRender()
  await editor.canvas.click(200, 400)
  await editor.canvas.waitForRender()
  await editor.canvas.click(200, 480)
  await editor.canvas.waitForRender()
  await editor.canvas.pressKey('Enter')
  await editor.canvas.waitForRender()

  const children = await getPageChildren(editor.page)
  const vectors = children.filter((n) => n.type === 'VECTOR')
  expect(vectors.length).toBeGreaterThan(0)
  const last = vectors[vectors.length - 1]
  expect(last.vectorNetwork?.vertices.length).toBe(3)
  editor.canvas.assertNoErrors()
})

test('Pen Escape with 2 vertices keeps the open path', async () => {
  const before = (await getPageChildren(editor.page)).filter((n) => n.type === 'VECTOR').length

  await editor.canvas.pressKey('p')
  await editor.canvas.click(350, 400)
  await editor.canvas.waitForRender()
  await editor.canvas.click(440, 400)
  await editor.canvas.waitForRender()
  await editor.canvas.pressKey('Escape')
  await editor.canvas.waitForRender()

  // Figma keeps the path drawn so far.
  const after = (await getPageChildren(editor.page)).filter((n) => n.type === 'VECTOR').length
  expect(after).toBe(before + 1)
  editor.canvas.assertNoErrors()
})

test('Pen close path creates VECTOR with closed region', async () => {
  const before = (await getPageChildren(editor.page)).filter((n) => n.type === 'VECTOR').length

  await editor.canvas.pressKey('p')
  await editor.canvas.click(500, 200)
  await editor.canvas.waitForRender()
  await editor.canvas.click(580, 200)
  await editor.canvas.waitForRender()
  await editor.canvas.click(540, 270)
  await editor.canvas.waitForRender()
  await editor.canvas.click(500, 200)
  await editor.canvas.waitForRender()

  const after = (await getPageChildren(editor.page)).filter((n) => n.type === 'VECTOR').length
  expect(after).toBeGreaterThan(before)

  const vectors = (await getPageChildren(editor.page)).filter((n) => n.type === 'VECTOR')
  const last = vectors[vectors.length - 1]
  expect(last.vectorNetwork?.regions?.length).toBeGreaterThan(0)
  editor.canvas.assertNoErrors()
})

test('Frame selects directly and draws an editable frame', async () => {
  const before = (await getPageChildren(editor.page)).filter((node) => node.type === 'FRAME').length
  await editor.canvas.pressKey('f')
  const frameButton = editor.page.getByTestId(toolbarToolTestId('FRAME'))
  const frameOptions = editor.page.getByTestId(toolbarFlyoutTestId('FRAME'))

  await expect(frameButton).toHaveAttribute('aria-pressed', 'true')
  await expect(frameOptions).toHaveCount(0)
  await editor.canvas.drag(300, 300, 420, 380)
  await editor.canvas.waitForRender()
  const frames = (await getPageChildren(editor.page)).filter((node) => node.type === 'FRAME')
  expect(frames).toHaveLength(before + 1)
  expect(frames.at(-1)).toMatchObject({ width: 120, height: 80 })
  editor.canvas.assertNoErrors()
})
