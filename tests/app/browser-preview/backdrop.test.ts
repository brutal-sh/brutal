import { expect, test } from 'bun:test'

import { createBrowserBackdrop } from '@/app/browser-preview/backdrop'
import { createDeferred } from '@/app/runtime/deferred'

const frame = new Uint8Array([1, 2, 3])

test('publishes only a decoded frame and revokes each replaced or closed object URL', async () => {
  const loading = createDeferred<undefined>()
  const backdrop = createBrowserBackdrop(
    async () => frame,
    () => loading.promise
  )
  try {
    const preparing = backdrop.prepare(() => true)
    await Promise.resolve()
    expect(backdrop.src.value).toBeNull()
    expect(backdrop.pending.value).toBe(true)
    loading.resolve(undefined)
    expect(await preparing).toBe(true)
    const first = backdrop.src.value
    if (!first) throw new Error('Missing decoded backdrop')
    expect([...new Uint8Array(await (await fetch(first)).arrayBuffer())]).toEqual([1, 2, 3])
    await backdrop.prepare(() => true)
    await expect(fetch(first)).rejects.toThrow()
    const second = backdrop.src.value
    backdrop.clear()
    if (!second) throw new Error('Missing replacement backdrop')
    await expect(fetch(second)).rejects.toThrow()
    expect(backdrop.src.value).toBeNull()
  } finally {
    backdrop.dispose()
  }
})

test('disposal or a changed destination cannot publish a late frame', async () => {
  const capture = createDeferred<Uint8Array<ArrayBuffer>>()
  const backdrop = createBrowserBackdrop(
    () => capture.promise,
    async () => undefined
  )
  const pending = backdrop.prepare(() => true)
  backdrop.dispose()
  capture.resolve(frame)
  expect(await pending).toBe(false)
  expect(backdrop.pending.value).toBe(false)
  expect(backdrop.src.value).toBeNull()
  expect(await backdrop.prepare(() => true)).toBe(false)
  const changed = createBrowserBackdrop(
    async () => frame,
    async () => undefined
  )
  try {
    expect(await changed.prepare(() => false)).toBe(false)
    expect(changed.src.value).toBeNull()
  } finally {
    changed.dispose()
  }
})

test('a superseded decode cannot replace a newer frame or clear its pending state', async () => {
  const first = createDeferred<undefined>()
  const second = createDeferred<undefined>()
  let reads = 0
  const backdrop = createBrowserBackdrop(
    async () => frame,
    () => (reads++ === 0 ? first.promise : second.promise)
  )
  try {
    const old = backdrop.prepare(() => true)
    await Promise.resolve()
    const current = backdrop.prepare(() => true)
    await Promise.resolve()
    first.resolve(undefined)
    expect(await old).toBe(false)
    expect(backdrop.pending.value).toBe(true)
    second.resolve(undefined)
    expect(await current).toBe(true)
    expect(backdrop.src.value).not.toBeNull()
  } finally {
    backdrop.dispose()
  }
})

test('disposal during image decoding cannot restore the closed backdrop', async () => {
  const decoding = createDeferred<undefined>()
  const backdrop = createBrowserBackdrop(
    async () => frame,
    () => decoding.promise
  )
  const preparing = backdrop.prepare(() => true)
  await Promise.resolve()
  backdrop.dispose()
  decoding.resolve(undefined)
  expect(await preparing).toBe(false)
  expect(backdrop.src.value).toBeNull()
  expect(backdrop.pending.value).toBe(false)
})

test('failed decoding keeps the previous valid backdrop and leaves preparation retryable', async () => {
  let fail = false
  const backdrop = createBrowserBackdrop(
    async () => frame,
    async () => {
      if (fail) throw new Error('Decode failed')
    }
  )
  try {
    await backdrop.prepare(() => true)
    const previous = backdrop.src.value
    fail = true
    await expect(backdrop.prepare(() => true)).rejects.toThrow('Decode failed')
    expect(backdrop.src.value).toBe(previous)
    expect(backdrop.pending.value).toBe(false)
  } finally {
    backdrop.dispose()
  }
})
