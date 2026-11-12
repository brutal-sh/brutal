import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import {
  expectRectangles,
  pickOwnedFile,
  prepareExistingFileRecovery,
  readOwnedFile,
  restoreExistingFileRecovery,
  saveOriginal
} from '#tests/helpers/document/existing-file-recovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import { createRecoveryRestartProfile } from '#tests/helpers/document/restart'

async function restoreAndSave(
  page: Page,
  original: Uint8Array,
  backup: Awaited<ReturnType<typeof recoveryBytes>>
) {
  const canvas = new CanvasHelper(page)
  await page.goto('/')
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).toBeVisible()
  expect(await recoveryBytes(page)).toEqual(backup)
  expect(await readOwnedFile(page)).toEqual(original)
  await restoreExistingFileRecovery(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  expect(await readOwnedFile(page)).toEqual(original)
  await saveOriginal(page)
  await expectRectangles(await readOwnedFile(page), 2)
  canvas.assertNoErrors()
}

async function reopenSavedFile(page: Page) {
  const canvas = new CanvasHelper(page)
  await page.goto('/')
  await canvas.waitForInit()
  await expect(page.getByRole('alertdialog', { name: 'Recover unsaved work' })).not.toBeVisible()
  expect(await recoveryBytes(page)).toHaveLength(0)
  await expectRectangles(await readOwnedFile(page), 2)
  await pickOwnedFile(page)
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  await page.getByTestId('layers-item').first().click()
  await canvas.duplicate()
  await expect(page.getByTestId('layers-item')).toHaveCount(3)
  await canvas.undo()
  await expect(page.getByTestId('layers-item')).toHaveCount(2)
  canvas.assertNoErrors()
}

test('existing-file backup survives browser process loss and explicit Save survives another restart', async ({
  playwright,
  baseURL,
  channel,
  launchOptions,
  viewport,
  deviceScaleFactor,
  colorScheme,
  storageState
}, info) => {
  // Three independent browser launches belong to this interruption contract.
  test.setTimeout(45_000)
  test.skip(process.platform === 'win32', 'The owned process identity check requires POSIX ps')
  const profile = await createRecoveryRestartProfile(
    playwright.chromium,
    {
      ...launchOptions,
      channel,
      baseURL,
      viewport,
      deviceScaleFactor,
      colorScheme
    },
    info
  )
  try {
    const { page: firstPage, ...first } = await profile.launch(storageState)
    const { canvas, original } = await prepareExistingFileRecovery(firstPage)
    const backup = await recoveryBytes(firstPage)
    canvas.assertNoErrors()
    await info.attach('before-interruption', {
      contentType: 'application/json',
      body: JSON.stringify({ first, backup })
    })
    const interruption = await profile.crash()
    const { page: secondPage, ...second } = await profile.launch()
    expect(second.pid).not.toBe(first.pid)
    await restoreAndSave(secondPage, original, backup)
    await profile.close()
    const { page: thirdPage, ...third } = await profile.launch()
    expect(third.pid).not.toBe(second.pid)
    await reopenSavedFile(thirdPage)
    await info.attach('owned-process-restarts', {
      contentType: 'application/json',
      body: JSON.stringify({ first, interruption, second, third }, null, 2)
    })
  } finally {
    await profile.close()
  }
})
