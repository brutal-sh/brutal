import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'

import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import {
  getRecoveryStore,
  isRecoveryStoreMemoryFallback,
  recoveryRevision,
  resetRecoveryStoreForTests
} from '@/app/document/recovery/store'

const originalFactory = indexedDB

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  resetRecoveryStoreForTests()
  globalThis.indexedDB = originalFactory
})

test('successful recovery mutations invalidate the draft list while reads remain quiet', async () => {
  resetRecoveryStoreForTests(createMemoryRecoveryStore())
  const store = getRecoveryStore()
  const initial = recoveryRevision.value
  const draft = { id: 'one', documentName: 'Draft', figBytes: new Uint8Array([1, 2, 3]) }
  await store.write(draft)
  expect(recoveryRevision.value).toBe(initial + 1)
  expect(await store.read(draft.id)).toMatchObject(draft)
  expect(await store.list()).toHaveLength(1)
  expect(recoveryRevision.value).toBe(initial + 1)
  await store.remove(draft.id)
  expect(await store.list()).toEqual([])
  expect(recoveryRevision.value).toBe(initial + 2)
  await store.write(draft)
  await store.clear()
  expect(await store.list()).toEqual([])
  expect(recoveryRevision.value).toBe(initial + 4)
})

for (const operation of ['write', 'remove', 'clear'] as const) {
  test(`a failed recovery ${operation} does not announce a completed mutation`, async () => {
    const failure = new Error('Fixture mutation refused')
    resetRecoveryStoreForTests({
      ...createMemoryRecoveryStore(),
      [operation]: async () => {
        throw failure
      }
    })
    const store = getRecoveryStore()
    const initial = recoveryRevision.value
    const actions = {
      write: () => store.write({ id: 'one', documentName: 'Draft', figBytes: new Uint8Array([1]) }),
      remove: () => store.remove('one'),
      clear: () => store.clear()
    }
    await expect(actions[operation]()).rejects.toThrow(failure)
    expect(recoveryRevision.value).toBe(initial)
  })
}

test('IndexedDB write refusal migrates retained bytes and notifies only the completed write', async () => {
  const store = getRecoveryStore()
  const first = { id: 'first', documentName: 'First', figBytes: new Uint8Array([1, 2]) }
  const second = { id: 'second', documentName: 'Second', figBytes: new Uint8Array([3, 4]) }
  await store.write(first)
  const initial = recoveryRevision.value
  const put = spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('Fixture quota', 'QuotaExceededError')
  })
  try {
    await store.write(second)
  } finally {
    put.mockRestore()
  }
  expect(isRecoveryStoreMemoryFallback()).toBe(true)
  expect(recoveryRevision.value).toBe(initial + 1)
  expect(await store.read(first.id)).toMatchObject(first)
  expect(await store.read(second.id)).toMatchObject(second)
  await store.remove(first.id)
  expect(await store.read(first.id)).toBeNull()
  await store.clear()
  expect(await store.list()).toEqual([])
  resetRecoveryStoreForTests()
  expect(await getRecoveryStore().list()).toEqual([])
})
