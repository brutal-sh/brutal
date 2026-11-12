import { expect, test, type Page } from '@playwright/test'

import { recoveryBytes } from '#tests/helpers/document/recovery'
import {
  expectUnrelatedEditable,
  prepareUnrelatedDrafts,
  recoveryRow,
  reloadRecovery,
  TARGET_DRAFT
} from '#tests/helpers/document/recovery/decisions'

async function refuseRecoveryDelete(page: Page) {
  return page.evaluateHandle(() => {
    const prototype = IDBDatabase.prototype
    const original = prototype.transaction
    prototype.transaction = function (
      this: IDBDatabase,
      ...args: Parameters<IDBDatabase['transaction']>
    ) {
      if (this.name === 'open-pencil-recovery' && args[1] === 'readwrite')
        throw new DOMException('Fixture recovery delete refused', 'NotAllowedError')
      return original.apply(this, args)
    }
    return () => {
      prototype.transaction = original
    }
  })
}

test('failed recovery discard reports an error, retains both backups and permits a target-only retry', async ({
  page
}, testInfo) => {
  const { canvas, both, unrelated } = await prepareUnrelatedDrafts(page)
  const refusal = await refuseRecoveryDelete(page)
  try {
    const discard = recoveryRow(page, TARGET_DRAFT).getByRole('button', {
      name: 'Discard',
      exact: true
    })
    await discard.focus()
    await expect(discard).toBeFocused()
    await discard.press('Enter')
    const dialog = page.getByRole('alertdialog', { name: 'Recover unsaved work' })
    await expect(dialog.getByRole('alert')).toHaveAttribute('data-tone', 'error')
    await dialog.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath('discard-refused.png')
    })
    expect(await recoveryBytes(page)).toEqual(both)
    await expect(
      recoveryRow(page, TARGET_DRAFT).getByRole('button', { name: 'Discard', exact: true })
    ).toBeEnabled()
    await expect(
      recoveryRow(page, TARGET_DRAFT).getByRole('button', { name: 'Discard', exact: true })
    ).toBeFocused()
    await expect(
      recoveryRow(page, TARGET_DRAFT).getByRole('button', { name: 'Restore', exact: true })
    ).toBeEnabled()
  } finally {
    await refusal.evaluate((restore) => restore())
    await refusal.dispose()
  }
  await reloadRecovery(page)
  expect(await recoveryBytes(page)).toEqual(both)
  await recoveryRow(page, TARGET_DRAFT)
    .getByRole('button', { name: 'Discard', exact: true })
    .click()
  await expect(recoveryRow(page, TARGET_DRAFT)).toHaveCount(0)
  await expect(page.getByRole('alertdialog').getByRole('alert')).toHaveCount(0)
  expect(await recoveryBytes(page)).toEqual([unrelated])
  await reloadRecovery(page)
  expect(await recoveryBytes(page)).toEqual([unrelated])
  await expectUnrelatedEditable(page, canvas)
})
