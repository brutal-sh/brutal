import { expect, test } from '@playwright/test'

import {
  expectRectangles,
  openOwnedFile,
  savePicker,
  readOwnedFile
} from '#tests/helpers/document/existing-file-recovery'
import {
  attachExternalBoundaries,
  expectFailedConflictReload,
  prepareExternalChange,
  interceptOwnedFileOperation,
  saveConflictCopy,
  replaceOwnedFileExternally
} from '#tests/helpers/document/external-change'
import { recoveryBytes } from '#tests/helpers/document/recovery'

test('external changes retain unsaved content and recovery until a decision', async ({
  page
}, info) => {
  const state = await prepareExternalChange(page)
  const { canvas, backup, external } = state
  try {
    await expect(page.getByRole('alertdialog', { name: 'File changed', exact: true })).toBeVisible()
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    await expect(
      page.getByRole('img', { name: 'Unsaved changes', includeHidden: true })
    ).toBeVisible()
    expect(await recoveryBytes(page)).toEqual(backup)
    expect(await readOwnedFile(page)).toEqual(external)
    await page.getByRole('alertdialog').getByRole('button', { name: 'Ignore', exact: true }).click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
    await canvas.undo()
    await expect(page.getByTestId('layers-item')).toHaveCount(1)
    await canvas.redo()
    await expect(page.getByTestId('layers-item')).toHaveCount(2)
    canvas.assertNoErrors()
  } finally {
    await attachExternalBoundaries(page, info, state)
  }
})

test('explicit Reload chooses the external version and retires its unsaved backup', async ({
  page
}) => {
  const { canvas, external } = await prepareExternalChange(page)
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reload', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(page.getByTestId('layers-item')).toHaveCount(1)
  await expect(page.getByTestId('layers-item')).toContainText('External version')
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeHidden()
  await expect.poll(() => recoveryBytes(page)).toEqual([])
  expect(await readOwnedFile(page)).toEqual(external)
  canvas.assertNoErrors()
})

test('Save As cancellation retains both versions; a successful copy leaves the external original intact', async ({
  page
}) => {
  const { canvas, backup, external } = await prepareExternalChange(page)
  const cancelled = await savePicker(page, null)
  try {
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Save as…', exact: true })
      .click()
    await expect(
      page.getByRole('alertdialog').getByRole('button', { name: 'Ignore', exact: true })
    ).toBeEnabled()
    expect(await recoveryBytes(page)).toEqual(backup)
    expect(await readOwnedFile(page)).toEqual(external)
  } finally {
    await cancelled.evaluate((restore) => restore())
    await cancelled.dispose()
  }
  const picker = await savePicker(page, 'conflict-copy.pen')
  try {
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Save as…', exact: true })
      .click()
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expectRectangles(await readOwnedFile(page, 'conflict-copy.pen'), 2)
    expect(await readOwnedFile(page)).toEqual(external)
    expect(await recoveryBytes(page)).toEqual([])
    canvas.assertNoErrors()
  } finally {
    await picker.evaluate((restore) => restore())
    await picker.dispose()
  }
})

test('failed conflict-copy writes preserve dirty content, original bytes and recovery for retry', async ({
  page
}, info) => {
  const { canvas, backup, external } = await prepareExternalChange(page)
  const picker = await savePicker(page, 'conflict-copy.pen')
  try {
    const refusal = await interceptOwnedFileOperation(page, 'copy')
    try {
      await saveConflictCopy(page)
      await expect(page.getByRole('alertdialog').getByRole('alert')).toHaveAttribute(
        'data-tone',
        'error'
      )
      await expect(
        page.getByRole('alertdialog').getByRole('button', { name: 'Ignore', exact: true })
      ).toBeEnabled()
      await expect(page.getByTestId('layers-item')).toHaveCount(2)
      expect(await recoveryBytes(page)).toEqual(backup)
      expect(await readOwnedFile(page)).toEqual(external)
    } finally {
      await refusal.evaluate((gate) => gate.restore())
      await refusal.dispose()
    }
    await expectFailedConflictReload(page, info)
    expect(await recoveryBytes(page)).toEqual(backup)
    await saveConflictCopy(page)
    await expect(page.getByRole('alertdialog')).toBeHidden()
    await expectRectangles(await readOwnedFile(page, 'conflict-copy.pen'), 2)
    expect(await readOwnedFile(page)).toEqual(external)
    expect(await recoveryBytes(page)).toEqual([])
    canvas.assertNoErrors()
  } finally {
    await picker.evaluate((restore) => restore())
    await picker.dispose()
  }
})

test('clean existing files still load external changes without a conflict decision', async ({
  page
}) => {
  const canvas = await openOwnedFile(page)
  const external = await replaceOwnedFileExternally(page)
  await expect(page.getByTestId('layers-item')).toContainText('External version')
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeHidden()
  expect(await recoveryBytes(page)).toEqual([])
  expect(await readOwnedFile(page)).toEqual(external)
  canvas.assertNoErrors()
})

test('failed explicit Reload keeps the decision and recovery available for retry', async ({
  page
}) => {
  const { canvas, backup, external } = await prepareExternalChange(page)
  await expectFailedConflictReload(page)
  expect(await recoveryBytes(page)).toEqual(backup)
  expect(await readOwnedFile(page)).toEqual(external)
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reload', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(page.getByTestId('layers-item')).toContainText('External version')
  await expect.poll(() => recoveryBytes(page)).toEqual([])
  expect(await readOwnedFile(page)).toEqual(external)
  canvas.assertNoErrors()
})

test('pending copy writes keep the original conflict identity and block dismissal until completion', async ({
  page
}, info) => {
  const { backup, external } = await prepareExternalChange(page)
  const picker = await savePicker(page, 'conflict-copy.pen')
  const gate = await interceptOwnedFileOperation(page, 'hold-copy')
  try {
    await saveConflictCopy(page)
    await expect.poll(() => gate.evaluate((probe) => probe.started())).toBe(true)
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('existing')
    await expect(dialog).not.toContainText('conflict-copy')
    await expect(dialog.getByRole('button', { name: 'Ignore', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    expect(await recoveryBytes(page)).toEqual(backup)
    expect(await readOwnedFile(page)).toEqual(external)
    await info.attach('held-copy-conflict', {
      body: await dialog.screenshot(),
      contentType: 'image/png'
    })
    await gate.evaluate((probe) => probe.release())
    await expect(dialog).toBeHidden()
    await expectRectangles(await readOwnedFile(page, 'conflict-copy.pen'), 2)
    expect(await readOwnedFile(page)).toEqual(external)
    expect(await recoveryBytes(page)).toEqual([])
  } finally {
    await gate.evaluate((probe) => probe.restore())
    await gate.dispose()
    await picker.evaluate((restore) => restore())
    await picker.dispose()
  }
})
