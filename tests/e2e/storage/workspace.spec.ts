import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { openAppMenu } from '#tests/helpers/menu'
import {
  configureTestStorage,
  exerciseStorageEdit,
  mockStorageUploads,
  mockStorageWorkspace
} from '#tests/helpers/storage/workspace'

test('configured storage lists previews through ranges before opening the document', async ({
  page
}) => {
  const requests = await mockStorageWorkspace(page)

  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(100, 120, 120, 90)
  await page.keyboard.press('ControlOrMeta+,')
  await page.getByTestId('settings-section-storage').click()
  await configureTestStorage(page)

  await page.getByTestId('settings-storage-open-workspace').click()
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  const entry = page.getByRole('button', { name: /Remote design/ })
  await expect(entry).toBeVisible()
  const preview = entry.locator('img')
  await expect(preview).toBeVisible()
  await expect(preview).toHaveAttribute('src', /^blob:/)
  expect(requests.rangeGets).toBe(3)
  expect(requests.fullDocumentGets).toBe(0)

  await entry.click()
  await expect(page).toHaveURL(/\/$/)
  await canvas.waitForInit()
  await expect(page.getByText('Remote design').first()).toBeVisible()
  expect(requests.fullDocumentGets).toBe(1)

  await page.getByRole('tab', { name: /^Untitled/ }).click()
  await canvas.waitForInit()
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(0)
  await canvas.redo()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  canvas.assertNoErrors()
})

test('storage workspace directs unconfigured users to Settings', async ({ page }) => {
  await page.goto('/storage')

  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect(page.getByText('Configure storage before using this workspace.')).toBeVisible()
  await expect(
    page.getByTestId('recent-files-home').getByRole('button', { name: 'New design', exact: true })
  ).toBeEnabled()

  await page.getByRole('button', { name: 'Settings' }).last().click()
  await page.getByTestId('settings-section-storage').click()
  await expect(page.getByTestId('settings-storage-panel')).toBeVisible()
})

test('storage workspace opens a remote design for canvas edits and Undo', async ({ page }) => {
  await mockStorageWorkspace(page, 'variable-override-precedence.fig')
  await page.goto('/storage')
  const home = page.getByTestId('recent-files-home')
  await home.getByRole('button', { name: 'Settings', exact: true }).last().click()
  await page.getByTestId('settings-section-storage').click()
  await configureTestStorage(page)
  await page.getByTestId('settings-storage-open-workspace').click()
  await home.getByRole('button', { name: /Remote design/ }).click()
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await exerciseStorageEdit(canvas)
  canvas.assertNoErrors()
})

test('Save to storage uploads the open document and lists it in the workspace', async ({
  page
}) => {
  const objects = await mockStorageUploads(page)

  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  // Before storage is configured, the command opens storage settings.
  let file = await openAppMenu(page, 'File')
  await file.getByRole('menuitem', { name: 'Save to storage…' }).click()
  const panel = page.getByTestId('settings-storage-panel')
  await expect(panel).toBeVisible()
  await configureTestStorage(page)
  await page.getByTestId('app-settings-done').click()

  file = await openAppMenu(page, 'File')
  await file.getByRole('menuitem', { name: 'Save to storage…' }).click()
  await expect
    .poll(() => [...objects.keys()].filter((key) => key.includes('/canvases/')).sort())
    .toEqual([
      expect.stringMatching(/^open_pencil_storage\/canvases\/[^/]+\.fig$/),
      expect.stringMatching(/^open_pencil_storage\/canvases\/[^/]+\.meta\.json$/)
    ])
  const uploaded = [...objects].find(([key]) => key.endsWith('.fig'))?.[1]
  // An exported .fig is a zip archive holding the document and its thumbnail.
  expect(uploaded?.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]))

  file = await openAppMenu(page, 'File')
  await file.getByRole('menuitem', { name: 'Open storage workspace…' }).click()
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Untitled/ }).first()).toBeVisible()
})
