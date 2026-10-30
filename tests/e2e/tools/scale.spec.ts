import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { scaleDriver } from '#tests/helpers/canvas/scale-driver'

const editor = useEditorSetupWithClear('/?test')
const scale = scaleDriver(() => editor.page)

test.beforeEach(async () => {
  await scale.seed()
  await editor.canvas.pressKey('k')
  await expect.poll(async () => (await scale.state()).tool).toBe('SCALE')
})

async function dragHandle() {
  const box = await editor.canvas.canvas.boundingBox()
  if (!box) throw new Error('Canvas unavailable')
  await editor.page.mouse.move(box.x + 320, box.y + 280)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + 440, box.y + 360, { steps: 8 })
}

// Playwright requires a destructuring fixture argument; this suite owns its page through editor.
// eslint-disable-next-line no-empty-pattern
test('K scales frame, text and strokes with one document Undo', async ({}, testInfo) => {
  await dragHandle()
  await editor.page.mouse.up()
  await expect
    .poll(() => scale.state())
    .toMatchObject({
      width: 240,
      height: 160,
      stroke: 4,
      fontSize: 32,
      textX: 20,
      textY: 20,
      canUndo: true
    })
  await editor.page.screenshot({ path: testInfo.outputPath('scaled-content.png') })
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => scale.state())
    .toMatchObject({
      width: 120,
      height: 80,
      stroke: 2,
      fontSize: 16,
      textX: 10,
      textY: 10,
      canUndo: false
    })
  editor.canvas.assertNoErrors()
})

// eslint-disable-next-line no-empty-pattern
test('the Move flyout selects Scale without changing the document', async ({}, testInfo) => {
  await editor.canvas.pressKey('v')
  await editor.page.getByRole('button', { name: 'Move options', exact: true }).click()
  await expect(editor.page.getByRole('menuitemradio', { name: /Scale/ })).toBeVisible()
  await editor.page.screenshot({ path: testInfo.outputPath('move-scale-flyout.png') })
  await editor.page.getByRole('menuitemradio', { name: /Scale/ }).click()
  await expect
    .poll(() => scale.state())
    .toMatchObject({ tool: 'SCALE', width: 120, canUndo: false })
})

test('Escape during scaling restores the document without an Undo entry', async () => {
  await dragHandle()
  await expect.poll(async () => (await scale.state()).fontSize).toBe(32)
  await editor.page.keyboard.press('Escape')
  await editor.page.mouse.up()
  await expect
    .poll(() => scale.state())
    .toMatchObject({
      width: 120,
      height: 80,
      stroke: 2,
      fontSize: 16,
      textX: 10,
      textY: 10,
      canUndo: false
    })
  editor.canvas.assertNoErrors()
})
