import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes, seedRecovery } from '#tests/helpers/document/recovery'
import { getPageChildren } from '#tests/helpers/store'

for (const dismissal of ['button', 'Escape'] as const) {
  test(`permission fallback persists beyond transient feedback and dismisses with ${dismissal}`, async ({
    page
  }) => {
    await page.clock.install()
    await page.goto('/?test')
    await new CanvasHelper(page).waitForInit()
    await seedRecovery(page)
    const before = await getPageChildren(page)
    const backup = await recoveryBytes(page)
    expect(backup).toHaveLength(1)
    // Seed the failed-native-alert boundary; actual native refusal is checked separately.
    await page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Owned editor unavailable')
      store.lastSaveFailed.value = true
      store.savePermissionFailure.value = 'unwritable.pen'
    })
    const dialog = page.getByRole('alertdialog', { name: 'Could not save “unwritable.pen”' })
    const okay = dialog.getByRole('button', { name: 'OK', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('File → Save As')
    await expect(okay).toBeFocused()
    await page.clock.fastForward(11_000)
    await expect(dialog).toBeVisible()
    await expect(okay).toBeFocused()
    expect(await recoveryBytes(page)).toEqual(backup)
    await dialog.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('permission-fallback.png')
    })
    if (dismissal === 'button') await okay.click()
    else await okay.press('Escape')
    await expect(dialog).not.toBeVisible()
    expect(await getPageChildren(page)).toEqual(before)
    expect(await recoveryBytes(page)).toEqual(backup)
    expect(
      await page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        return store
          ? {
              dirty: store.hasUnsavedChanges(),
              failed: store.lastSaveFailed.value,
              permissionFailure: store.savePermissionFailure.value
            }
          : null
      })
    ).toEqual({ dirty: true, failed: true, permissionFailure: null })
  })
}
