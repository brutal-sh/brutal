import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

const editor = useEditorSetup()

test('autosave writes actual edited pen bytes through its established file handle', async () => {
  const file = await editor.page.evaluateHandle(async () => {
    const directory = await navigator.storage.getDirectory()
    const handle = await directory.getFileHandle('autosave.pen', { create: true })
    const original = window.showSaveFilePicker
    window.showSaveFilePicker = async () => handle
    return {
      read: async () => Array.from(new Uint8Array(await (await handle.getFile()).arrayBuffer())),
      restore: () => {
        window.showSaveFilePicker = original
      }
    }
  })
  try {
    await (
      await openAppMenu(editor.page, 'File')
    )
      .getByRole('menuitem', { name: /^Save as…/ })
      .click()
    await expect
      .poll(() => file.evaluate(async (state) => (await state.read()).length))
      .toBeGreaterThan(0)
    const autosave = (await openAppMenu(editor.page, 'File')).getByRole('menuitemcheckbox', {
      name: 'Auto-save to local file',
      exact: true
    })
    await expect(autosave).not.toBeChecked()
    await autosave.click()
    await editor.canvas.drawRect(400, 400, 60, 60)
    await expect
      .poll(async () => {
        const bytes = new Uint8Array(await file.evaluate((state) => state.read()))
        const document = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
          name: 'autosave.pen',
          data: bytes
        })
        return [...document.graph.nodes.values()]
          .filter((node) => node.type === 'RECTANGLE')
          .map((node) => ({ width: node.width, height: node.height }))
      })
      .toEqual([{ width: 60, height: 60 }])
    await expect(editor.page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
    editor.canvas.assertNoErrors()
  } finally {
    await file.evaluate((state) => state.restore())
    await file.dispose()
  }
})

test('an unsaved design keeps a recovery draft without opening a file picker', async ({
  browser,
  baseURL
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  })
  try {
    const page = await context.newPage()
    await mockOfficialCloudDiscovery(page)
    await page.goto('/')
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    const picker = await page.evaluateHandle(() => {
      const state = { calls: 0 }
      window.showSaveFilePicker = async () => {
        state.calls++
        throw new Error('An unwritable draft must not open a file picker')
      }
      return state
    })
    try {
      await canvas.drawRect(100, 100, 50, 50)
      const menu = await openAppMenu(page, 'File')
      await expect(
        menu.getByRole('menuitemcheckbox', { name: 'Auto-save to local file', exact: true })
      ).toHaveCount(0)
      await page.keyboard.press('Escape')
      await expect.poll(async () => (await recoveryBytes(page)).length).toBe(1)
      expect(await picker.evaluate((state) => state.calls)).toBe(0)
      await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
      canvas.assertNoErrors()
    } finally {
      await picker.dispose()
    }
  } finally {
    await context.close()
  }
})
