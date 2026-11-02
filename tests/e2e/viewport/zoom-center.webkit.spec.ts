import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-rulers')

async function centerPoint() {
  const bounds = await editor.page.getByTestId('canvas-element').boundingBox()
  if (!bounds) throw new Error('Canvas is unavailable')
  expect(bounds.x).toBeGreaterThan(40)
  return editor.page.evaluate(
    ({ x, y }) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Editor is unavailable')
      return { zoom: store.state.zoom, point: store.screenToCanvas(x, y) }
    },
    { x: bounds.width / 2, y: bounds.height / 2 }
  )
}

for (const surface of ['floating controls', 'zoom menu'] as const) {
  test(`${surface} preserve the canvas center with an offset sidebar`, async () => {
    for (const action of ['Zoom out', 'Zoom in']) {
      const before = await centerPoint()
      if (surface === 'zoom menu') {
        await editor.page.getByTestId('zoom-dropdown-trigger').click()
        await editor.page.getByRole('menuitem', { name: new RegExp(`^${action}\\b`) }).click()
      } else {
        await editor.page.getByRole('button', { name: action, exact: true }).click()
      }
      const after = await centerPoint()
      if (action === 'Zoom out') expect(after.zoom).toBeLessThan(before.zoom)
      else expect(after.zoom).toBeGreaterThan(before.zoom)
      expect(after.point.x).toBeCloseTo(before.point.x, 5)
      expect(after.point.y).toBeCloseTo(before.point.y, 5)
    }
    editor.canvas.assertNoErrors()
  })
}
