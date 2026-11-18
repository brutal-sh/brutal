import { expect, test } from '@playwright/test'

import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import {
  expectUnrelatedEditable,
  prepareUnrelatedDrafts,
  recoveryRow,
  reloadRecovery,
  restoreDraft,
  saveDraftDownload,
  TARGET_DRAFT,
  UNRELATED_DRAFT
} from '#tests/helpers/document/recovery/decisions'

test.beforeEach(async ({ page }) => {
  await mockOfficialCloudDiscovery(page)
})

for (const decision of ['Save', 'Save As', 'Cancel', 'Close', 'Discard'] as const) {
  test(`${decision} affects only its selected draft and preserves unrelated recovery`, async ({
    page
  }) => {
    const { canvas, both, unrelated } = await test.step('Prepare two independent backups', () =>
      prepareUnrelatedDrafts(page))
    if (decision === 'Discard') {
      await recoveryRow(page, TARGET_DRAFT)
        .getByRole('button', { name: 'Discard', exact: true })
        .click()
      await expect(recoveryRow(page, TARGET_DRAFT)).toHaveCount(0)
    } else if (decision === 'Close') {
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Close', exact: true })
        .click()
    } else {
      await restoreDraft(page, TARGET_DRAFT)
      if (decision === 'Cancel') {
        await page.getByTestId('tabbar-close').click()
        await page
          .getByRole('alertdialog', { name: /Save changes to/ })
          .getByRole('button', { name: 'Cancel', exact: true })
          .click()
        await expect(page.getByRole('tab', { name: /^Decision target / })).toHaveAttribute(
          'aria-selected',
          'true'
        )
      } else await saveDraftDownload(page, decision === 'Save As')
    }
    const keepsBoth = decision === 'Cancel' || decision === 'Close'
    await expect.poll(async () => (await recoveryBytes(page)).length).toBe(keepsBoth ? 2 : 1)
    const after = await recoveryBytes(page)
    if (keepsBoth) expect(after).toEqual(both)
    else expect(after).toEqual([unrelated])
    await reloadRecovery(page)
    expect(await recoveryBytes(page)).toEqual(after)
    await expect(recoveryRow(page, TARGET_DRAFT)).toHaveCount(keepsBoth ? 1 : 0)
    await expect(recoveryRow(page, UNRELATED_DRAFT)).toBeVisible()
    await test.step('Restore unrelated content and verify Duplicate/Undo', () =>
      expectUnrelatedEditable(page, canvas))
  })
}
