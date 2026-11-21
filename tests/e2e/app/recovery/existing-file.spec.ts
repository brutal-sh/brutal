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
import { useRecoverySetup } from '#tests/helpers/document/recovery/setup'
import { openAppMenu } from '#tests/helpers/menu'

test.describe('recovered original Save and history', () => {
  const ctx = useRecoverySetup(recoverExistingFile)
  test('existing-file recovery preserves the original until Save, then retains history and reopens', async () => {
    const {
      page,
      state: { canvas, original }
    } = ctx
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
})

test.describe('recovered backup kept on close', () => {
  const ctx = useRecoverySetup(recoverExistingFile)
  test('keeping a recovered backup reopens the latest edits by original file identity', async () => {
    const {
      page,
      state: { canvas, original }
    } = ctx
    const editedName = 'Latest recovered edit'
    await page.getByTestId('layers-item').first().click()
    const layerName = page.getByRole('textbox', { name: 'Layer name', exact: true })
    await layerName.fill(editedName)
    await layerName.press('Enter')
    const editedLayer = page.getByTestId('layers-item').filter({ hasText: editedName })
    await expect(editedLayer).toHaveCount(1)
    const refuseRetention = await page.evaluateHandle(() => {
      const prototype = IDBObjectStore.prototype
      const put = prototype.put
      prototype.put = function (value: unknown, key?: IDBValidKey) {
        if (
          this.name === 'meta' &&
          typeof value === 'object' &&
          value !== null &&
          'retainedOnClose' in value
        )
          throw new DOMException('Fixture could not retain backup', 'QuotaExceededError')
        return put.call(this, value, key)
      }
      return () => {
        prototype.put = put
      }
    })
    const dialog = page.getByRole('alertdialog', { name: /Save changes to/ })
    const keep = dialog.getByRole('button', { name: 'Close and Keep Backup', exact: true })
    try {
      await page.getByTestId('tabbar-close').click()
      await keep.click()
      await expect(
        page.getByRole('region', { name: /Notifications/ }).getByText(/^Could not keep the backup/)
      ).toBeVisible()
      await expect(editedLayer).toHaveCount(1)
      expect(await readOwnedFile(page)).toEqual(original)
    } finally {
      await refuseRetention.evaluate((restore) => restore())
      await refuseRetention.dispose()
    }
    await page.getByTestId('tabbar-close').click()
    await keep.click()
    await expect(page.getByTestId('tabbar-close')).toHaveCount(0)
    expect(await readOwnedFile(page)).toEqual(original)
    expect(await recoveryBytes(page)).toHaveLength(1)

    await pickOwnedFile(page)
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    await expect(editedLayer).toHaveCount(1)
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
    expect(await readOwnedFile(page)).toEqual(original)
    await saveOriginal(page)
    const written = await readOwnedFile(page)
    await expectRectangles(written, 2)
    expect(new TextDecoder().decode(written)).toContain(editedName)
    canvas.assertNoErrors()
  })
})

test.describe('recovered Save As outcomes', () => {
  const ctx = useRecoverySetup(recoverExistingFile)
  test('cancelling recovered Save As keeps its backup; saving a copy preserves the original', async () => {
    const {
      page,
      state: { canvas, original }
    } = ctx
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
    const copy = await savePicker(page, 'copy.brut')
    try {
      await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Save as…/ }).click()
      await expect(page.getByRole('img', { name: 'Unsaved changes' })).not.toBeVisible()
      await expect.poll(async () => (await recoveryBytes(page)).length).toBe(0)
      expect(await readOwnedFile(page)).toEqual(original)
      await expectRectangles(await readOwnedFile(page, 'copy.brut'), 2)
    } finally {
      await copy.evaluate((restore) => restore())
      await copy.dispose()
    }
    canvas.assertNoErrors()
  })
})

test.describe('recovered write refusal', () => {
  const ctx = useRecoverySetup(recoverExistingFile)
  test('a refused recovered-file write retains its backup until explicit discard', async () => {
    const {
      page,
      state: { canvas, original }
    } = ctx
    const backup = await recoveryBytes(page)
    const refusal = await page.evaluateHandle(() => {
      const prototype = FileSystemFileHandle.prototype
      const descriptor:
        | TypedPropertyDescriptor<FileSystemFileHandle['createWritable']>
        | undefined = Object.getOwnPropertyDescriptor(prototype, 'createWritable')
      const original = descriptor?.value
      if (!original) throw new Error('Missing file write method')
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
        .getByRole('button', { name: 'Discard Backup', exact: true })
        .click()
      await expect.poll(async () => (await recoveryBytes(page)).length).toBe(0)
      expect(await readOwnedFile(page)).toEqual(original)
    } finally {
      await refusal.evaluate((restore) => restore())
      await refusal.dispose()
    }
    canvas.assertNoErrors()
  })
})
