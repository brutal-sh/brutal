import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'

import { IDBFactory } from 'fake-indexeddb'

import { createIdbRecoveryStore } from '@/app/document/recovery/idb'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'

const bytes = new Uint8Array([1, 2, 3, 4])

describe('document recovery store', () => {
  // Every file in a shard shares this process and its `indexedDB` global.
  // Another suite may leave the production recovery store's connection open
  // (createEditorStore() opens it), which would block a deleteDatabase() here
  // and queue our open() behind it until the test times out. A fresh factory
  // per test isolates this suite from that and from its own previous test.
  const sharedFactory = indexedDB

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory()
  })

  afterAll(() => {
    globalThis.indexedDB = sharedFactory
  })

  test('stores metadata and FIG bytes atomically in IndexedDB', async () => {
    const store = createIdbRecoveryStore()
    const metadata = await store.write({
      id: 'recovery-1',
      documentName: 'Agent draft',
      figBytes: bytes
    })

    expect(metadata).toMatchObject({
      id: 'recovery-1',
      documentName: 'Agent draft',
      byteLength: 4,
      formatVersion: 1
    })
    expect(await store.list()).toEqual([metadata])
    expect(await store.read('recovery-1')).toEqual({ ...metadata, figBytes: bytes })

    await store.remove('recovery-1')
    expect(await store.list()).toEqual([])
    expect(await store.read('recovery-1')).toBeNull()
  })

  test('stores a view into a larger buffer as its own bytes', async () => {
    const store = createIdbRecoveryStore()
    const buffer = new Uint8Array([9, 9, 1, 2, 3, 9])
    await store.write({
      id: 'recovery-1',
      documentName: 'Agent draft',
      figBytes: buffer.subarray(2, 5)
    })
    const stored = await store.read('recovery-1')
    expect(stored?.figBytes).toEqual(new Uint8Array([1, 2, 3]))
    expect(stored?.figBytes.buffer.byteLength).toBe(3)
  })

  test('retention marks only the chosen file backup and keeps its bytes', async () => {
    const store = createIdbRecoveryStore()
    const file = {
      fileName: 'owned.pen',
      identity: { path: '/fixtures/owned.pen', handle: null }
    }
    await store.write({ id: 'owned', documentName: 'Owned', figBytes: bytes, source: file })
    await store.write({ id: 'draft', documentName: 'Draft', figBytes: bytes })
    const draft = await store.read('draft')

    expect(await store.retain('missing')).toBe(false)
    expect(await store.retain('draft')).toBe(false)
    expect(await store.retain('owned')).toBe(true)
    expect(await store.read('owned')).toMatchObject({
      retainedOnClose: true,
      figBytes: bytes,
      source: file
    })
    expect(await store.read('draft')).toEqual(draft)
  })

  test('memory store owns input and output bytes', async () => {
    const store = createMemoryRecoveryStore()
    const input = new Uint8Array(bytes)
    await store.write({ id: 'one', documentName: 'Draft', figBytes: input })
    input[0] = 99

    const first = await store.read('one')
    expect(first?.figBytes[0]).toBe(1)
    if (first) first.figBytes[0] = 88
    expect((await store.read('one'))?.figBytes[0]).toBe(1)
  })
})
