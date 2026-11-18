import { expect, test, type Route } from '@playwright/test'

import { recoveryBytes } from '#tests/helpers/document/recovery'
import { reloadRecovery, restoreDraft } from '#tests/helpers/document/recovery/decisions'
import { useRecoverySetup } from '#tests/helpers/document/recovery/setup'
import {
  beginRecoveryWrite,
  decodeRecoveryArchive,
  observeRecoveryFlush,
  prepareRecoveryArchives,
  recoveryArchives,
  restoredGeometry,
  retryRecoveryWrite
} from '#tests/helpers/document/recovery/workers'

test.describe('refused live recovery compression', () => {
  const ctx = useRecoverySetup(prepareRecoveryArchives)
  test('failed serialization preserves accepted backups and an explicit retry restores new content', async () => {
    const { page, state } = ctx
    const before = await recoveryArchives(page)
    const pattern = '**/io/formats/fig/export/worker*'
    const refuse = (route: Route) => route.abort('failed')
    await page.route(pattern, refuse, { times: 1 })
    try {
      const outcome = await beginRecoveryWrite(page).result
      expect(outcome.status).toBe('rejected')
      if (outcome.status === 'rejected') expect(outcome.message).toBeTruthy()
      expect(await recoveryBytes(page)).toEqual(state.backups)
      state.canvas.assertNoErrors()
    } finally {
      await page.unroute(pattern, refuse)
    }
    await retryRecoveryWrite(page)
    const after = await recoveryArchives(page)
    const untouched = state.documents[0]
    const changed = state.documents[1]
    if (!untouched || !changed) throw new Error('Missing recovery identities')
    expect(after.find((row) => row.id === untouched.id)).toEqual(
      before.find((row) => row.id === untouched.id)
    )
    const accepted = after.find((row) => row.id === changed.id)
    if (!accepted) throw new Error('Missing retried snapshot')
    const nodes = await decodeRecoveryArchive(accepted)
    expect(nodes).toHaveLength(3)
    expect(nodes).toContainEqual(expect.objectContaining({ width: 42, height: 38 }))
    const backups = await recoveryBytes(page)
    await reloadRecovery(page)
    await restoreDraft(page, changed.name)
    expect((await restoredGeometry(page)).nodes).toHaveLength(3)
    expect(await recoveryBytes(page)).toEqual(backups)
    await expect.poll(() => state.workers.active.size).toBe(0)
    state.canvas.assertNoErrors()
  })
})

test.describe('automatic multi-tab recovery', () => {
  const ctx = useRecoverySetup((page) => prepareRecoveryArchives(page, false))
  test('automatic debounce stores two valid snapshots without an explicit persistence request', async () => {
    const { page, state } = ctx
    await expect.poll(async () => (await recoveryArchives(page)).length).toBe(2)
    const archives = await recoveryArchives(page)
    for (const expected of state.documents) {
      const archive = archives.find((row) => row.id === expected.id)
      if (!archive) throw new Error('Missing automatic recovery archive')
      const nodes = await decodeRecoveryArchive(archive)
      expect(nodes).toHaveLength(2)
      expect(nodes).toContainEqual(
        expect.objectContaining({ width: expected.width, height: expected.height })
      )
    }
    await expect.poll(() => state.workers.active.size).toBe(0)
    state.canvas.assertNoErrors()
  })
})

test.describe('cancelled cold reload', () => {
  const ctx = useRecoverySetup((page) => prepareRecoveryArchives(page, false))
  test('cancelled unload keeps the live edits and permits its early recovery flush to finish', async () => {
    const { page, state } = ctx
    const before = await restoredGeometry(page)
    expect(before.dirty).toBe(true)
    const ids = state.documents.map((document) => document.id)
    const flush = await observeRecoveryFlush(page, ids)
    try {
      expect(await flush.evaluate((probe) => probe.calls())).toEqual([])
      const dialogShown = page.waitForEvent('dialog')
      // A dismissed reload can leave Playwright waiting for a navigation that never commits.
      await page.evaluate(() => {
        setTimeout(() => window.location.reload(), 0)
      })
      const dialog = await dialogShown
      await dialog.dismiss()
      expect(dialog.type()).toBe('beforeunload')
      expect((await flush.evaluate((probe) => probe.calls())).toSorted()).toEqual(ids.toSorted())
    } finally {
      await flush.evaluate((probe) => probe.restore())
      await flush.dispose()
    }
    expect(await restoredGeometry(page)).toEqual(before)
    await expect.poll(async () => (await recoveryArchives(page)).length).toBe(2)
    for (const archive of await recoveryArchives(page)) {
      const expected = state.documents.find((row) => row.id === archive.id)
      if (!expected) throw new Error('Unexpected cold recovery archive')
      expect(await decodeRecoveryArchive(archive)).toContainEqual(
        expect.objectContaining({ width: expected.width, height: expected.height })
      )
    }
    await expect.poll(() => state.workers.active.size).toBe(0)
    state.canvas.assertNoErrors()
  })
})
