import { expect, type Dialog, type Page } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

const existingDesign = JSON.stringify({
  version: '2.21',
  children: [
    {
      id: 'original',
      type: 'rectangle',
      name: 'Existing rectangle',
      width: 64,
      height: 64,
      fill: '#2563eb'
    }
  ]
})

export async function showLayers(page: Page) {
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
}

export async function pickOwnedFile(page: Page, name = 'existing.pen') {
  const picker = await page.evaluateHandle(async (name) => {
    const directory = await navigator.storage.getDirectory()
    const handle = await directory.getFileHandle(name)
    const original = window.showOpenFilePicker
    window.showOpenFilePicker = async () => [handle]
    return () => {
      window.showOpenFilePicker = original
    }
  }, name)
  try {
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
  } finally {
    await picker.evaluate((restore) => restore())
    await picker.dispose()
  }
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await showLayers(page)
  return canvas
}

export async function readOwnedFile(page: Page, name = 'existing.pen') {
  return new Uint8Array(
    await page.evaluate(async (name) => {
      const directory = await navigator.storage.getDirectory()
      const handle = await directory.getFileHandle(name)
      return Array.from(new Uint8Array(await (await handle.getFile()).arrayBuffer()))
    }, name)
  )
}

async function openOwnedFile(page: Page) {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
  await page.evaluate(async (content) => {
    const directory = await navigator.storage.getDirectory()
    const handle = await directory.getFileHandle('existing.pen', { create: true })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
  }, existingDesign)
  const canvas = await pickOwnedFile(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  return canvas
}

async function reloadAndRestore(page: Page) {
  const acceptUnload = (dialog: Dialog) => dialog.accept()
  page.on('dialog', acceptUnload)
  try {
    await page.reload()
  } finally {
    page.off('dialog', acceptUnload)
  }
  const recovery = page.getByRole('alertdialog', { name: 'Recover unsaved work' })
  await expect(recovery).toBeVisible()
  await recovery.getByRole('button', { name: 'Restore', exact: true }).click()
  await new CanvasHelper(page).waitForInit()
  await showLayers(page)
}

export async function recoverExistingFile(page: Page) {
  const canvas = await openOwnedFile(page)
  const original = await readOwnedFile(page)
  const autosave = (await openAppMenu(page, 'File')).getByRole('menuitemcheckbox', {
    name: 'Auto-save to local file',
    exact: true
  })
  await expect(autosave).not.toBeChecked()
  await page.keyboard.press('Escape')
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
  expect(await readOwnedFile(page)).toEqual(original)
  await expect.poll(async () => (await recoveryBytes(page)).length).toBe(1)
  await page.keyboard.press('ControlOrMeta+t')
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('tab', { name: 'Drafts', exact: true }).click()
  await expect(home.getByText('No drafts yet', { exact: true })).toBeVisible()
  await reloadAndRestore(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  expect(await readOwnedFile(page)).toEqual(original)
  return { canvas, original }
}

export async function expectRectangles(bytes: Uint8Array, count: number) {
  const document = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
    name: 'owned.pen',
    data: bytes
  })
  expect(document.sourceFormat).toBe('pen')
  const rectangles = [...document.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
  expect(rectangles).toHaveLength(count)
  for (const rectangle of rectangles) expect(rectangle).toMatchObject({ width: 64, height: 64 })
}

export async function saveOriginal(page: Page) {
  await (
    await openAppMenu(page, 'File')
  )
    .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
    .first()
    .click()
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
  await expect.poll(async () => (await recoveryBytes(page)).length).toBe(0)
}

export async function savePicker(page: Page, name: string | null) {
  return page.evaluateHandle(async (name) => {
    const original = window.showSaveFilePicker
    if (name === null)
      window.showSaveFilePicker = async () => {
        throw new DOMException('Cancelled', 'AbortError')
      }
    else {
      const directory = await navigator.storage.getDirectory()
      const handle = await directory.getFileHandle(name, { create: true })
      window.showSaveFilePicker = async () => handle
    }
    return () => {
      window.showSaveFilePicker = original
    }
  }, name)
}
