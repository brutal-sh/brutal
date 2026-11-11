import { expect, test } from '@playwright/test'

import {
  expectRectangles,
  pickOwnedFile,
  readOwnedFile,
  recoverExistingFile,
  saveOriginal,
  savePicker
} from '#tests/helpers/document/existing-file-recovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { openAppMenu } from '#tests/helpers/menu'

test('existing-file recovery preserves the original until Save, then retains history and reopens', async ({
  page
}) => {
  const { canvas, original } = await recoverExistingFile(page)
  const backup = await recoveryBytes(page)
  await page.getByTestId('tabbar-close').click()
  await page
    .getByRole('alertdialog', { name: /Save changes to/ })
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  expect(await recoveryBytes(page)).toEqual(backup)
  expect(await readOwnedFile(page)).toEqual(original)
  await saveOriginal(page)
  await expectRectangles(await readOwnedFile(page), 2)
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(3)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await canvas.redo()
  await expect(page.getByTestId('layers-item')).toHaveCount(3)
  await saveOriginal(page)
  await expectRectangles(await readOwnedFile(page), 3)
  await page.getByTestId('tabbar-close').click()
  await pickOwnedFile(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(3)
  canvas.assertNoErrors()
})

test('cancelling recovered Save As keeps its backup; saving a copy preserves the original', async ({
  page
}) => {
  const { canvas, original } = await recoverExistingFile(page)
  const backup = await recoveryBytes(page)
  const cancelled = await savePicker(page, null)
  try {
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
    expect(await recoveryBytes(page)).toEqual(backup)
    expect(await readOwnedFile(page)).toEqual(original)
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
  } finally {
    await cancelled.evaluate((restore) => restore())
    await cancelled.dispose()
  }
  const copy = await savePicker(page, 'copy.pen')
  try {
    await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
    await expect.poll(async () => (await recoveryBytes(page)).length).toBe(0)
    expect(await readOwnedFile(page)).toEqual(original)
    await expectRectangles(await readOwnedFile(page, 'copy.pen'), 2)
  } finally {
    await copy.evaluate((restore) => restore())
    await copy.dispose()
  }
  canvas.assertNoErrors()
})

test('a refused recovered-file write retains its backup until explicit discard', async ({
  page
}) => {
  const { canvas, original } = await recoverExistingFile(page)
  const backup = await recoveryBytes(page)
  const refusal = await page.evaluateHandle(() => {
    const prototype = FileSystemFileHandle.prototype
    const original = prototype.createWritable
    prototype.createWritable = async function (this: FileSystemFileHandle, options) {
      if (this.name === 'existing.pen')
        throw new DOMException('Fixture write refused', 'NotAllowedError')
      return original.call(this, options)
    }
    return () => {
      prototype.createWritable = original
    }
  })
  try {
    await (
      await openAppMenu(page, 'File')
    )
      .getByRole('menuitem', { name: /^Save(?:\s|$)/ })
      .first()
      .click()
    await expect(page.getByText(/Fixture write refused/)).toBeVisible()
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
    expect(await recoveryBytes(page)).toEqual(backup)
    expect(await readOwnedFile(page)).toEqual(original)
    await page.getByTestId('tabbar-close').click()
    await page
      .getByRole('alertdialog', { name: /Save changes to/ })
      .getByRole('button', { name: 'Don’t Save', exact: true })
      .click()
    await expect.poll(async () => (await recoveryBytes(page)).length).toBe(0)
    expect(await readOwnedFile(page)).toEqual(original)
  } finally {
    await refusal.evaluate((restore) => restore())
    await refusal.dispose()
  }
  canvas.assertNoErrors()
})
