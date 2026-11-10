import { strict as assert } from 'node:assert'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { reloadNativeEditor } from '#tests/helpers/tauri/navigation'
import { settleNativeRecovery } from '#tests/helpers/tauri/recovery'

async function snapshotDigests() {
  return browser.executeAsync<{ failure?: string; digests?: string[] }, []>(async (done) => {
    try {
      const opening = indexedDB.open('open-pencil-recovery')
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        opening.onsuccess = () => resolve(opening.result)
        opening.onerror = () => reject(opening.error)
      })
      try {
        const transaction = database.transaction('fig', 'readonly')
        const request = transaction.objectStore('fig').getAll()
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(transaction.error)
          transaction.onabort = () => reject(transaction.error)
        })
        const values: unknown[] = request.result
        const digests = await Promise.all(
          values.map(async (value) => {
            const bytes = value instanceof Blob ? await value.arrayBuffer() : value
            if (!(bytes instanceof ArrayBuffer) && !(bytes instanceof Uint8Array))
              throw new Error('Unexpected recovery bytes')
            const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
            return Array.from(new Uint8Array(digest), (byte) =>
              byte.toString(16).padStart(2, '0')
            ).join('')
          })
        )
        done({ digests: digests.toSorted() })
      } finally {
        database.close()
      }
    } catch (reason) {
      done({ failure: String(reason) })
    }
  })
}

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
  const before = await snapshotDigests()
  assert.equal(before.failure, undefined)
  assert.ok(before.digests && before.digests.length > 0)
  await settleNativeRecovery()
  await offer.waitForExist({ reverse: true })
  const after = await snapshotDigests()
  assert.equal(after.failure, undefined)
  assert.deepEqual(after.digests, before.digests)
})
