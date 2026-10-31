import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'
import { getEditingTextId, getSelectedNode } from '#tests/helpers/store'

const editor = useEditorSetupWithClear('/?test&no-rulers')

async function typeCanvasText(text: string) {
  await editor.canvas.selectTool('text')
  await editor.canvas.click(300, 300)
  await editor.page.keyboard.type(text)
  await expect.poll(async () => (await getSelectedNode(editor.page))?.text).toBe(text)
}

test('keyboard history edits canvas text while its hidden input keeps focus', async () => {
  await typeCanvasText('abcdef')
  const before = await getSelectedNode(editor.page)
  await editor.page.locator('textarea[data-canvas-text-input]').dispatchEvent('keydown', {
    key: 'z',
    code: 'KeyZ',
    [process.platform === 'darwin' ? 'metaKey' : 'ctrlKey']: true,
    isComposing: true
  })
  expect((await getSelectedNode(editor.page))?.text).toBe('abcdef')
  await editor.page.keyboard.press('ControlOrMeta+z')
  await expect.poll(async () => (await getSelectedNode(editor.page))?.text).toBe('')
  expect((await getSelectedNode(editor.page))?.id).toBe(before?.id)
  await editor.page.keyboard.press('ControlOrMeta+Shift+z')
  await expect.poll(async () => (await getSelectedNode(editor.page))?.text).toBe('abcdef')
  await editor.page.keyboard.press('Escape')
})

test('Undo reaches a pending edit on an existing text layer with empty history', async () => {
  await typeCanvasText('abcdef')
  await editor.page.keyboard.press('Escape')
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    store.undo.clear()
  })
  expect(await editor.page.evaluate(() => window.openPencil?.getStore?.().undo.canUndo)).toBe(false)
  await editor.page.keyboard.press('Enter')
  await expect(editor.page.locator('textarea[data-canvas-text-input]')).toBeFocused()
  await editor.page.keyboard.press('ControlOrMeta+a')
  await editor.page.keyboard.type('uvwxyz')
  await expect.poll(async () => (await getSelectedNode(editor.page))?.text).toBe('uvwxyz')
  const undo = (await openAppMenu(editor.page, 'Edit')).getByRole('menuitem', { name: /^Undo\b/ })
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect.poll(async () => (await getSelectedNode(editor.page))?.text).toBe('abcdef')
  await (await openAppMenu(editor.page, 'Edit')).getByRole('menuitem', { name: /^Redo\b/ }).click()
  await expect.poll(async () => (await getSelectedNode(editor.page))?.text).toBe('uvwxyz')
  await editor.page.keyboard.press('Escape')
  await expect.poll(() => getEditingTextId(editor.page)).toBeNull()
})

test('a Context field retains native keyboard Undo while a canvas edit is open', async () => {
  await typeCanvasText('Canvas text')
  await editor.page.getByRole('button', { name: 'Context', exact: true }).click()
  const field = editor.page.getByRole('textbox', { name: 'Context information', exact: true })
  await field.pressSequentially('Field text')
  await field.press('ControlOrMeta+z')
  await expect(field).toHaveValue('')
  expect((await getSelectedNode(editor.page))?.text).toBe('Canvas text')
  await editor.canvas.click(100, 100)
})
