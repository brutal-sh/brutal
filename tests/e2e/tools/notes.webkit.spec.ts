import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { noteDriver } from '#tests/helpers/canvas/note-driver'
import { toolbarToolTestId } from '#tests/helpers/test-ids'

const editor = useEditorSetupWithClear()

test('Pen Note click and drag placement use the measured native geometry and edit history', async () => {
  const notes = noteDriver(editor.page)
  await notes.origin()
  const button = editor.page.getByTestId(toolbarToolTestId('NOTE'))
  await expect(button).toBeVisible()
  await editor.page.keyboard.press('n')
  await editor.canvas.click(400, 300)
  await expect
    .poll(() => notes.selected())
    .toMatchObject({
      tool: 'SELECT',
      note: { type: 'FRAME', name: 'Note', x: 175, y: 90.5, width: 250, height: 219, text: '' }
    })
  expect((await notes.selected()).editing).not.toBeNull()
  await editor.page.keyboard.type('Click-created reference')
  await editor.page.keyboard.press('Escape')
  await expect
    .poll(() => notes.selected())
    .toMatchObject({
      editing: null,
      note: { text: 'Click-created reference', width: 250, height: 219 }
    })
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => notes.selected()).toMatchObject({ note: { text: '' } })
  await editor.page.keyboard.press('ControlOrMeta+Shift+z')
  await expect
    .poll(() => notes.selected())
    .toMatchObject({ note: { text: 'Click-created reference' } })
  await button.click()
  await editor.canvas.drag(650, 400, 850, 550)
  await expect
    .poll(() => notes.selected())
    .toMatchObject({
      tool: 'SELECT',
      note: { x: 425, y: 190.5, width: 250, height: 219, text: '' }
    })
  expect((await notes.selected()).editing).not.toBeNull()
  await editor.page.keyboard.press('Escape')
  await expect
    .poll(() => notes.selected())
    .toMatchObject({
      editing: null,
      note: { width: 250, height: 219, text: '' }
    })
  editor.canvas.assertNoErrors()
})
