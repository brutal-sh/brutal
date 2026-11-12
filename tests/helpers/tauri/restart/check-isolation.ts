import { strict as assert } from 'node:assert'
import { basename } from 'node:path'

import { repoPath } from '#tests/helpers/paths'

import { createNativeRecoveryRestart } from './session'

type Profile = Awaited<ReturnType<typeof createNativeRecoveryRestart>>
type Opened = Awaited<ReturnType<Profile['launch']>>
type StorageReply = { value?: string | null; failure?: string }

assert.equal(process.platform, 'darwin', 'Native persistent storage requires macOS 14+')
const binary = repoPath('desktop/target/debug/OpenPencil')
const first = await createNativeRecoveryRestart(binary)
const databaseName = `open-pen-native-isolation-${basename(first.owner.root)}`

function accessSentinel(name: string, write: string | null, done: (reply: StorageReply) => void) {
  void (async () => {
    try {
      const opening = indexedDB.open(name, 1)
      opening.onupgradeneeded = () => opening.result.createObjectStore('owner')
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        opening.onsuccess = () => resolve(opening.result)
        opening.onerror = () =>
          reject(opening.error ?? new Error('Unable to open sentinel database'))
      })
      try {
        const transaction = database.transaction('owner', write === null ? 'readonly' : 'readwrite')
        const completed = new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve()
          transaction.onerror = () =>
            reject(transaction.error ?? new Error('Sentinel transaction failed'))
          transaction.onabort = () =>
            reject(transaction.error ?? new Error('Sentinel transaction failed'))
        })
        const store = transaction.objectStore('owner')
        const request = write === null ? store.get('value') : store.put(write, 'value')
        const stored: unknown = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error ?? new Error('Sentinel request failed'))
        })
        await completed
        if (stored !== undefined && typeof stored !== 'string')
          throw new Error('Unexpected owned sentinel value')
        done({ value: write ?? stored ?? null })
      } finally {
        database.close()
      }
    } catch (reason) {
      done({ failure: String(reason) })
    }
  })()
}

async function expectOwner(
  phase: string,
  opened: Opened,
  expected: string | null,
  write: string | null = null
) {
  const reply = await opened.session.executeAsync(accessSentinel, databaseName, write)
  process.stdout.write(
    JSON.stringify({ phase, identity: opened.identity, databaseName, reply }) + '\n'
  )
  assert.equal(reply.failure, undefined, `${phase}: sentinel operation must succeed`)
  assert.equal(reply.value, expected, `${phase}: owned persistent stores must remain independent`)
}

async function checkSecondProfile() {
  const second = await createNativeRecoveryRestart(binary)
  assert.notDeepEqual(second.owner.storeId, first.owner.storeId)
  try {
    const fresh = await second.launch()
    await expectOwner('B starts empty', fresh, null)
    await expectOwner('B writes its sentinel', fresh, 'profile-B', 'profile-B')
    await second.close()
    await expectOwner('B retains its sentinel after restart', await second.launch(), 'profile-B')
    await second.close()
  } finally {
    await second.dispose()
  }
}

try {
  await expectOwner('A writes its sentinel', await first.launch(), 'profile-A', 'profile-A')
  await first.close()
  await expectOwner('A retains its sentinel after restart', await first.launch(), 'profile-A')
  await first.close()
  await checkSecondProfile()
  await expectOwner('A remains unchanged after B', await first.launch(), 'profile-A')
  await first.close()
  process.stdout.write('NATIVE_STORE_ISOLATION_PASSED\n')
} finally {
  await first.dispose()
}
