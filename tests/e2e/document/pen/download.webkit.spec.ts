import { readFile, writeFile } from 'node:fs/promises'

import { expect, test, type Page, type TestInfo } from '@playwright/test'

import { parsePenDocument } from '@open-pencil/pen'

import { CanvasHelper } from '#tests/helpers/canvas'
import { showLayers } from '#tests/helpers/document/existing-file-recovery'
import { openAppMenu } from '#tests/helpers/menu'

const rectangle = {
  id: 'versioned',
  type: 'rectangle',
  name: 'Literal // name /* retained */',
  width: 64,
  height: 64,
  fill: '#2563eb'
}

async function openFile(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent('filechooser')
  await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  await (await chooser).setFiles(path)
  await new CanvasHelper(page).waitForInit()
  await showLayers(page)
}

async function start(page: Page, info: TestInfo, version: string) {
  await page.addInitScript(() => {
    window.showOpenFilePicker = undefined
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const name = `schema-${version}.pen`
  const path = info.outputPath(name)
  const original = Buffer.from(
    `// Owned file\r\n${JSON.stringify({ version, children: [rectangle] }).replace('"children"', '/* valid comment */ "children"')} // end`
  )
  await writeFile(path, original)
  await openFile(page, path)
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  return { canvas, name, path, original }
}

async function downloadSave(page: Page) {
  const download = page.waitForEvent('download')
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  const result = await download
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
  return result
}

for (const version of ['2.7', '2.22']) {
  test(`schema ${version} uses the download fallback without replacing its original file`, async ({
    page
  }, info) => {
    const state = await start(page, info, version)
    await page.getByTestId('layers-item').first().click()
    await state.canvas.duplicate()
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    const saved = await downloadSave(page)
    expect(saved.suggestedFilename()).toBe(state.name)
    const path = info.outputPath('reopened.pen')
    await saved.saveAs(path)
    const document = parsePenDocument((await readFile(path)).toString('utf8'))
    expect(document.version).toBe('2.22')
    expect(document.children).toHaveLength(2)
    expect(document.children.some((child) => child.name === rectangle.name)).toBe(true)
    expect(await readFile(state.path)).toEqual(state.original)
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Close tab/ }).click()
    await openFile(page, path)
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
  })
}

test('a future-version refusal preserves the fallback save target and source bytes', async ({
  page
}, info) => {
  const state = await start(page, info, '2.22')
  await page.getByTestId('layers-item').first().click()
  await state.canvas.duplicate()
  const path = info.outputPath('future.pen')
  const future = Buffer.from(JSON.stringify({ version: '2.23', children: [rectangle] }))
  await writeFile(path, future)
  await openFile(page, path)
  await expect(page.locator('[data-slot="toast"]')).toContainText('2.23')
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
  await state.canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await state.canvas.redo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  const saved = await downloadSave(page)
  expect(saved.suggestedFilename()).toBe(state.name)
  expect(
    parsePenDocument((await readFile(await saved.path())).toString('utf8')).children
  ).toHaveLength(2)
  expect(await readFile(state.path)).toEqual(state.original)
  expect(await readFile(path)).toEqual(future)
})
