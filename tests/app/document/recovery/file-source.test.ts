import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { IDBFactory } from 'fake-indexeddb'
import { ref } from 'vue'

import { createDocumentRecovery } from '@/app/document/recovery/controller'
import { createIdbRecoveryStore } from '@/app/document/recovery/idb'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import { parseRecoveryFileSource } from '@/app/document/recovery/metadata'
import {
  getRecoveryStore,
  isRecoveryStoreMemoryFallback,
  resetRecoveryStoreForTests
} from '@/app/document/recovery/store'

const originalFactory = indexedDB
const source = { fileName: 'original.pen', identity: { handle: null, path: '/owned/original.pen' } }

beforeEach(() => {
  resetRecoveryStoreForTests()
  globalThis.indexedDB = new IDBFactory()
})
afterEach(() => {
  resetRecoveryStoreForTests()
  globalThis.indexedDB = originalFactory
})

for (const [name, createStore] of Object.entries({
  memory: createMemoryRecoveryStore,
  indexedDB: createIdbRecoveryStore
})) {
  test(`${name} retains file identity and keeps legacy drafts separate`, async () => {
    const store = createStore()
    const file = { id: 'file', documentName: 'Original', source, figBytes: new Uint8Array([1, 2]) }
    await store.write(file)
    await store.write({ id: 'draft', documentName: 'Draft', figBytes: new Uint8Array([3]) })
    expect(await store.read('file')).toMatchObject(file)
    expect((await store.read('draft'))?.source).toBeUndefined()
    expect((await store.list()).filter((snapshot) => snapshot.source === undefined)).toHaveLength(1)
  })

  test(`${name} rejects an invalid new identity without replacing the retained backup`, async () => {
    const store = createStore()
    const file = { id: 'file', documentName: 'Original', source, figBytes: new Uint8Array([1, 2]) }
    await store.write(file)
    await expect(
      store.write({
        ...file,
        figBytes: new Uint8Array([9]),
        source: {
          ...source,
          identity: { handle: null, path: 'https://untrusted.example/file.pen' }
        }
      })
    ).rejects.toThrow('Recovery file identity is invalid')
    expect(await store.read('file')).toMatchObject(file)
  })
}

test('file backup origins reject missing capabilities, forged handles and mismatched filenames', () => {
  for (const invalid of [
    { ...source, identity: { handle: null, path: null } },
    { ...source, identity: { handle: { kind: 'file', name: 'original.pen' }, path: null } },
    { ...source, fileName: 'different.fig' },
    { ...source, identity: { handle: null, path: '/owned/original.pen\0' } }
  ])
    expect(() => parseRecoveryFileSource(invalid)).toThrow('Recovery file identity is invalid')
  expect(parseRecoveryFileSource(source)).toEqual(source)
})

test('local file edits persist while a provisional managed save keeps the prior backup', async () => {
  const store = createMemoryRecoveryStore()
  const version = ref(0)
  const managed = ref(false)
  const recovery = createDocumentRecovery({
    state: { documentName: 'Original' },
    version: () => version.value,
    hasWritableSource: () => true,
    getSource: () => (managed.value ? null : source),
    buildFigFile: () => new Uint8Array([version.value]),
    recoveryId: 'owned',
    store
  })
  try {
    version.value = 1
    await recovery.persistNow()
    expect(await store.read('owned')).toMatchObject({ source, figBytes: new Uint8Array([1]) })
    managed.value = true
    version.value = 2
    await recovery.persistNow()
    expect((await store.read('owned'))?.figBytes).toEqual(new Uint8Array([1]))
    managed.value = false
    await recovery.persistNow()
    expect(await store.read('owned')).toMatchObject({ source, figBytes: new Uint8Array([2]) })
  } finally {
    recovery.disposeRecovery()
  }
})

test('an invalid file origin does not switch valid persistent recovery to a memory-only fallback', async () => {
  const store = getRecoveryStore()
  await store.write({
    id: 'retained',
    documentName: 'Original',
    source,
    figBytes: new Uint8Array([1])
  })
  await expect(
    store.write({
      id: 'invalid',
      documentName: 'Invalid',
      figBytes: new Uint8Array([9]),
      source: { ...source, identity: { handle: null, path: 'relative.pen' } }
    })
  ).rejects.toThrow('Recovery file identity is invalid')
  expect(isRecoveryStoreMemoryFallback()).toBe(false)
  expect((await store.read('retained'))?.figBytes).toEqual(new Uint8Array([1]))
  await store.write({ id: 'later', documentName: 'Later', source, figBytes: new Uint8Array([2]) })
  expect((await createIdbRecoveryStore().read('later'))?.figBytes).toEqual(new Uint8Array([2]))
})
