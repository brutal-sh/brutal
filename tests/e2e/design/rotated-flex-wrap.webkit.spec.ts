import { readFile } from 'node:fs/promises'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { testPath } from '#tests/helpers/paths'

const editor = useEditorSetup('/?test&no-rulers')

async function prepareRotatedInput() {
  const data = await readFile(testPath('fixtures/pen-rotated-flex-wrap.pen'), 'utf8')
  await editor.page.evaluate((text) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([text], 'Rotated wrap.pen', { type: 'application/json' }))
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
  }, data)
  await editor.page.waitForFunction(() => window.openPencil?.getStore?.().graph.getNode('wrap-b'))
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    const canvas = document.querySelector('[data-test-id="canvas-element"]')
    if (!store || !canvas) throw new Error('Missing rotated-wrap editor')
    const bounds = canvas.getBoundingClientRect()
    store.state.zoom = 1
    store.state.panX = 100 + Math.floor(bounds.left) - bounds.left
    store.state.panY = 180 + Math.floor(bounds.top) - bounds.top
    store.select(['wrap-a', 'wrap-b'])
    store.requestRender()
  })
  return rootGeometry()
}

function rootGeometry() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing rotated-wrap editor')
    return store.graph
      .getChildren(store.state.currentPageId)
      .map(({ name, x, y, width, height, rotation }) => ({
        name,
        x,
        y,
        width,
        height,
        rotation
      }))
  })
}

async function expectCanvas(name: string) {
  await editor.page.mouse.move(0, 0)
  const bounds = await editor.canvas.canvas.boundingBox()
  if (!bounds) throw new Error('Missing rotated-wrap canvas bounds')
  await expect(editor.page).toHaveScreenshot(name, {
    clip: { x: bounds.x, y: bounds.y, width: 650, height: 350 },
    maxDiffPixels: 0,
    threshold: 0
  })
}

test('rotated Add flex keeps the measured extent through history and reflows on a later edit', async () => {
  const { page } = editor
  const original = await prepareRotatedInput()
  await page.getByRole('button', { name: 'Add flex layout', exact: true }).click()
  const width = page.getByRole('spinbutton', { name: 'Width', exact: true })
  const height = page.getByRole('spinbutton', { name: 'Height', exact: true })
  await expect(width).toHaveAttribute('aria-valuenow', '180')
  await expect(height).toHaveAttribute('aria-valuenow', '80')
  await expect(page.getByRole('checkbox', { name: 'Hug Width', exact: true })).toBeChecked()
  await expectCanvas('rotated-flex-initial.png')
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(rootGeometry).toEqual(original)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(width).toHaveAttribute('aria-valuenow', '180')
  await expect(height).toHaveAttribute('aria-valuenow', '80')
  await expectCanvas('rotated-flex-initial.png')
  const gap = page.getByRole('spinbutton', { name: 'Fixed gap amount', exact: true })
  await gap.dblclick()
  await gap.fill('61')
  await gap.press('Tab')
  await expect(width).toHaveAttribute('aria-valuenow', '221')
  await expect(height).toHaveAttribute('aria-valuenow', '80')
  await expectCanvas('rotated-flex-live-gap.png')
  editor.canvas.assertNoErrors()
})
