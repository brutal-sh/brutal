import { expect, test } from '@playwright/test'

import { readOwnedFile, savePicker } from '#tests/helpers/document/existing-file-recovery'
import { recoveryBytes } from '#tests/helpers/document/recovery'
import {
  recoveryRow,
  reloadRecovery,
  restoreDraft
} from '#tests/helpers/document/recovery/decisions'
import {
  decideFile,
  finishUnrelatedFile,
  prepareFileDecisions,
  refuseTargetWrite,
  TARGET_FILE,
  TARGET_NAME,
  UNRELATED_FILE
} from '#tests/helpers/document/recovery/files'
import { openAppMenu } from '#tests/helpers/menu'

for (const decision of ['Save', 'Save As', 'Cancel', 'Close', 'Discard'] as const) {
  test(`${decision} on a recovered file preserves unrelated file bytes and editable recovery`, async ({
    page
  }) => {
    const state = await prepareFileDecisions(page)
    await decideFile(page, decision)
    const keepsBoth = decision === 'Cancel' || decision === 'Close'
    const expected = keepsBoth ? state.both : [state.unrelated]
    await expect.poll(() => recoveryBytes(page)).toEqual(expected)
    expect(await readOwnedFile(page, UNRELATED_FILE)).toEqual(state.unrelatedOriginal)
    if (decision !== 'Save')
      expect(await readOwnedFile(page, TARGET_FILE)).toEqual(state.targetOriginal)
    await reloadRecovery(page)
    expect(await recoveryBytes(page)).toEqual(expected)
    await expect(recoveryRow(page, TARGET_NAME)).toHaveCount(keepsBoth ? 1 : 0)
    const targetBeforeUnrelatedSave = await readOwnedFile(page, TARGET_FILE)
    await finishUnrelatedFile(page, state.canvas)
    expect(await readOwnedFile(page, TARGET_FILE)).toEqual(targetBeforeUnrelatedSave)
    expect(await recoveryBytes(page)).toEqual(
      keepsBoth ? state.both.filter((backup) => backup.digest !== state.unrelated.digest) : []
    )
  })
}

for (const refusal of ['cancel Save As', 'refuse Save'] as const) {
  test(`${refusal} preserves both existing files and exact recovery backups`, async ({ page }) => {
    const state = await prepareFileDecisions(page)
    await restoreDraft(page, TARGET_NAME)
    const reset =
      refusal === 'cancel Save As' ? await savePicker(page, null) : await refuseTargetWrite(page)
    try {
      await (
        await openAppMenu(page, 'File')
      )
        .getByRole('menuitem', {
          name: refusal === 'cancel Save As' ? /^Save as…/ : /^Save(?:\s|$)/
        })
        .first()
        .click()
      if (refusal === 'refuse Save')
        await expect(
          page.getByRole('region', { name: /Notifications/ }).getByRole('listitem')
        ).toHaveAttribute('data-tone', 'error')
      await expect(page.getByRole('img', { name: 'Unsaved changes' })).toBeVisible()
      expect(await recoveryBytes(page)).toEqual(state.both)
      expect(await readOwnedFile(page, TARGET_FILE)).toEqual(state.targetOriginal)
      expect(await readOwnedFile(page, UNRELATED_FILE)).toEqual(state.unrelatedOriginal)
    } finally {
      await reset.evaluate((restore) => restore())
      await reset.dispose()
    }
    await reloadRecovery(page)
    expect(await recoveryBytes(page)).toEqual(state.both)
    await finishUnrelatedFile(page, state.canvas)
    expect(await recoveryBytes(page)).toEqual(
      state.both.filter((backup) => backup.digest !== state.unrelated.digest)
    )
    expect(await readOwnedFile(page, TARGET_FILE)).toEqual(state.targetOriginal)
  })
}
