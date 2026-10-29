import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'

const design = JSON.stringify({
  version: '2.7',
  children: [
    { id: 'slide', type: 'frame', name: 'Slide', width: 640, height: 360, fill: '#ffffff' }
  ]
})

test('opening, editing and saving a .pen downloads .pen bytes that can be reopened', async ({
  page
}) => {
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  // Exercise the supported download fallback using an actual file input and download.
  const picker = await page.evaluateHandle(() => {
    const originalOpen = window.showOpenFilePicker
    const originalSave = window.showSaveFilePicker
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
    return {
      restore: () => {
        window.showOpenFilePicker = originalOpen
        window.showSaveFilePicker = originalSave
      }
    }
  })
  try {
    const menu = await openAppMenu(page, 'File')
    const chooser = page.waitForEvent('filechooser')
    await menu.getByRole('menuitem', { name: /^Open…/ }).click()
    await (
      await chooser
    ).setFiles({ name: 'slides.pen', mimeType: 'application/json', buffer: Buffer.from(design) })
    await expect(page.getByRole('tab', { name: /slides/ })).toBeVisible()
    await canvas.waitForInit()
    await canvas.drawRect(300, 240, 100, 60)
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
    const download = page.waitForEvent('download')
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
      .filter({ hasText: /^Save/ })
      .first()
      .click()
    const saved = await download
    expect(saved.suggestedFilename()).toBe('slides.pen')
    const imported = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
      name: saved.suggestedFilename(),
      data: await readFile(await saved.path())
    })
    expect(imported.sourceFormat).toBe('pen')
    expect(
      [...imported.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
    ).toHaveLength(1)
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()

    page.once('dialog', (dialog) => dialog.accept('renamed.pen'))
    const renamedDownload = page.waitForEvent('download')
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
    const renamed = await renamedDownload
    expect(renamed.suggestedFilename()).toBe('renamed.pen')
    const renamedFile = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
      name: renamed.suggestedFilename(),
      data: await readFile(await renamed.path())
    })
    expect(renamedFile.sourceFormat).toBe('pen')
    expect(
      [...renamedFile.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
    ).toHaveLength(1)
    canvas.assertNoErrors()
  } finally {
    await picker.evaluate((handle) => handle.restore())
    await picker.dispose()
  }
})
