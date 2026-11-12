import { strict as assert } from 'node:assert'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { reloadNativeEditor } from '#tests/helpers/tauri/navigation'
import { settleNativeRecovery } from '#tests/helpers/tauri/recovery'
import { readNativeRecoveryDigests } from '#tests/helpers/tauri/restart/digests'

it('settles startup recovery before fixture input and closes its offer without changing snapshot bytes', async () => {
  await createNativeLayerFixture()
  const saved = await browser.executeAsync<{ failure?: string }, []>(async (done) => {
    try {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing isolated editor')
      await store.persistRecoveryNow()
      done({})
    } catch (reason) {
      done({ failure: String(reason) })
    }
  })
  assert.equal(saved.failure, undefined)
  await reloadNativeEditor()
  await browser.waitUntil(() =>
    browser.execute(() => Boolean(window.openPencil?.test?.recoveryReady))
  )
  await browser.executeAsync<undefined, []>(async (done) => {
    await window.openPencil?.test?.recoveryReady
    done(undefined)
  })
  const offer = $('[data-test-id="recovery-dialog"][data-state="open"]')
  await offer.waitForDisplayed()
  const before = await readNativeRecoveryDigests()
  assert.equal(before.failure, undefined)
  assert.ok(before.digests && before.digests.length > 0)
  await settleNativeRecovery()
  await offer.waitForExist({ reverse: true })
  const after = await readNativeRecoveryDigests()
  assert.equal(after.failure, undefined)
  assert.deepEqual(after.digests, before.digests)
})
