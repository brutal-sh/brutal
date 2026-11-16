import { writeFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { recoveryBytes } from '#tests/helpers/document/recovery'
import { reloadRecovery, restoreDraft } from '#tests/helpers/document/recovery/decisions'
import { useRecoverySetup } from '#tests/helpers/document/recovery/setup'
import {
  beginRecoveryWrite,
  decodeRecoveryArchive,
  holdRecoveryWorker,
  prepareRecoveryArchives,
  recoveryArchives,
  restoredGeometry
} from '#tests/helpers/document/recovery/workers'

const ctx = useRecoverySetup(prepareRecoveryArchives)

test('both concurrent snapshots decode and release their compression workers', async () => {
  const { page, state } = ctx
  const archives = await recoveryArchives(page)
  expect(archives).toHaveLength(2)
  expect(state.workers.events.filter((event) => event.event === 'started')).toHaveLength(2)
  expect(state.workers.peak).toBeGreaterThanOrEqual(2)
  for (const expected of state.documents) {
    const archive = archives.find((archive) => archive.id === expected.id)
    if (!archive) throw new Error('Missing owned archive')
    const archivePath = test.info().outputPath(`recovery-${expected.id}.fig`)
    await writeFile(archivePath, new Uint8Array(archive.bytes))
    await test.info().attach(`archive-${expected.id}`, {
      path: archivePath,
      contentType: 'application/octet-stream'
    })
    const nodes = await decodeRecoveryArchive(archive)
    expect(nodes).toHaveLength(2)
    expect(nodes).toContainEqual(
      expect.objectContaining({
        width: expected.width,
        height: expected.height
      })
    )
  }
  expect(state.workers.active.size).toBe(0)
  expect(await recoveryBytes(page)).toEqual(state.backups)
  state.canvas.assertNoErrors()
  await test.info().attach('compression-workers', {
    body: JSON.stringify(state.workers.events),
    contentType: 'application/json'
  })
})

test('reload during a held compression request preserves both accepted archives', async () => {
  const { page, state } = ctx
  const held = await holdRecoveryWorker(page)
  const pending = beginRecoveryWrite(page)
  try {
    await Promise.race([
      held.started,
      pending.result.then((result) => {
        throw new Error(
          `Recovery settled before the worker request barrier: ${JSON.stringify(result)}`
        )
      })
    ])
    expect(await recoveryBytes(page)).toEqual(state.backups)
    await reloadRecovery(page)
    const outcome = await pending.result
    await test.info().attach('interrupted-operation', {
      body: JSON.stringify(outcome),
      contentType: 'application/json'
    })
    expect(outcome.status).toBe('rejected')
  } finally {
    await held.release()
  }
  expect(await recoveryBytes(page)).toEqual(state.backups)
  await expect.poll(() => state.workers.active.size).toBe(0)
  await test.info().attach('interrupted-worker-events', {
    body: JSON.stringify(state.workers.events),
    contentType: 'application/json'
  })
  state.canvas.assertNoErrors()
})

for (const index of [0, 1]) {
  test(`snapshot ${index + 1} restores after a fresh reload without changing either backup`, async () => {
    const { page, state } = ctx
    const expected = state.documents[index]
    if (!expected) throw new Error('Missing owned document')
    await reloadRecovery(page)
    expect(await recoveryBytes(page)).toEqual(state.backups)
    await restoreDraft(page, expected.name)
    const restored = await restoredGeometry(page)
    expect(restored.dirty).toBe(true)
    expect(restored.nodes).toHaveLength(2)
    expect(restored.nodes).toContainEqual({
      type: 'RECTANGLE',
      width: expected.width,
      height: expected.height
    })
    expect(await recoveryBytes(page)).toEqual(state.backups)
    state.canvas.assertNoErrors()
  })
}
