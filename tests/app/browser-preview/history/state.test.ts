import { expect, test } from 'bun:test'

import { createBrowserHistoryState } from '@/app/browser-preview/history/state'
import { createDeferred } from '@/app/runtime/deferred'

function fixture(clearVisits: () => Promise<number> = async () => 1) {
  const values = new Map<string, string>()
  const failure = { read: false, write: false, remove: false }
  const storage = {
    getItem(key: string) {
      if (failure.read) throw new Error('Read failed')
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      if (failure.write) throw new Error('Write failed')
      values.set(key, value)
    },
    removeItem(key: string) {
      if (failure.remove) throw new Error('Delete failed')
      values.delete(key)
    }
  }
  return {
    state: createBrowserHistoryState(() => storage, clearVisits),
    values,
    failure,
    reopen: () => createBrowserHistoryState(() => storage, clearVisits)
  }
}
const first = { url: 'https://example.test/first', generation: 0 }
const second = { url: 'https://example.test/second', generation: 0 }

test('saved visits survive a fresh state and removing one retains the other visit', async () => {
  const { state, reopen } = fixture()
  state.remember(first)
  state.remember(second)
  expect(reopen().entries.value.map((entry) => entry.url)).toEqual([second.url, first.url])
  await state.remove(first.url)
  expect(reopen().entries.value.map((entry) => entry.url)).toEqual([second.url])
})

test('removing a saved local HTML visit preserves web visits and rejects stale completion', async () => {
  const file = { url: 'file:///private/tmp/owned-export.html', generation: 0 }
  const { state, reopen } = fixture()
  state.remember(first)
  state.remember(file)
  expect(reopen().entries.value.map((entry) => entry.url)).toEqual([file.url, first.url])
  expect(await state.remove(file.url)).toBe(true)
  state.remember(file)
  expect(reopen().entries.value.map((entry) => entry.url)).toEqual([first.url])
  state.remember({ ...file, generation: 1 })
  expect(reopen().entries.value.map((entry) => entry.url)).toEqual([file.url, first.url])
})

test('clear removes the saved key and ignores an older pending visit', async () => {
  const pending = createDeferred<number>()
  const { state, values, reopen } = fixture(() => pending.promise)
  state.remember(first)
  const clearing = state.clear()
  expect(state.pending.value).toBe(true)
  expect(await state.clear()).toBe(false)
  pending.resolve(1)
  expect(await clearing).toBe(true)
  expect(values.size).toBe(0)
  state.remember(first)
  expect(state.entries.value).toEqual([])
  state.remember({ ...second, generation: 1 })
  expect(reopen().entries.value.map((entry) => entry.url)).toEqual([second.url])
})

test('a failed persisted deletion retains the visible history and can be retried', async () => {
  const { state, values, failure } = fixture()
  state.remember(first)
  failure.remove = true
  expect(await state.clear()).toBe(false)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([first.url])
  expect(values.size).toBe(1)
  expect(state.error.value).toBeTruthy()
  failure.remove = false
  expect(await state.clear()).toBe(true)
  expect(state.entries.value).toEqual([])
  expect(values.size).toBe(0)
  expect(state.error.value).toBe('')
})

test('a failed native clear barrier retains saved history for retry', async () => {
  let failed = true
  const { state, values } = fixture(async () => {
    if (failed) throw new Error('No native response')
    return 1
  })
  state.remember(first)
  expect(await state.clear()).toBe(false)
  expect(values.size).toBe(1)
  expect(state.pending.value).toBe(false)
  expect(state.error.value).toBeTruthy()
  failed = false
  expect(await state.clear()).toBe(true)
  expect(values.size).toBe(0)
})

test('failed history writes leave the previous list and saved bytes intact', () => {
  const { state, values, failure } = fixture()
  state.remember(first)
  const saved = [...values.values()]
  failure.write = true
  state.remember(second)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([first.url])
  expect([...values.values()]).toEqual(saved)
  expect(state.error.value).toBeTruthy()
})

test('refresh reads external storage changes without writing a default history key', () => {
  const { state, values, reopen } = fixture()
  expect(values.size).toBe(0)
  state.remember(first)
  const other = reopen()
  state.remember(second)
  other.refresh()
  expect(other.entries.value.map((entry) => entry.url)).toEqual([second.url, first.url])
  values.clear()
  state.refresh()
  expect(state.entries.value).toEqual([])
  expect(values.size).toBe(0)
})

test('removing one visit rejects its old queued update without dropping other queued visits', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  state.remember(first)
  state.remember(second)
  const removing = state.remove(first.url)
  pending.resolve(1)
  expect(await removing).toBe(true)
  state.remember(first)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([second.url])
  state.remember({ url: 'https://example.test/other', generation: 0 })
  expect(state.entries.value.map((entry) => entry.url)).toEqual([
    'https://example.test/other',
    second.url
  ])
  state.remember({ ...first, generation: 1 })
  expect(state.entries.value[0]?.url).toBe(first.url)
})

test('clear keeps a visit completed after the native barrier but before its reply', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  state.remember(first)
  const clearing = state.clear()
  state.remember({ ...second, generation: 1 })
  pending.resolve(1)
  expect(await clearing).toBe(true)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([second.url])
})

test('remove keeps a fresh revisit received before its barrier reply', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  state.remember(first)
  const removing = state.remove(first.url)
  state.remember({ ...first, generation: 1 })
  pending.resolve(1)
  expect(await removing).toBe(true)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([first.url])
})

test('a failed clear retains visits received while waiting and keeps failure feedback', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  state.remember(first)
  const clearing = state.clear()
  state.remember(second)
  pending.reject(new Error('No native response'))
  expect(await clearing).toBe(false)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([second.url, first.url])
  expect(state.error.value).toBeTruthy()
})

test('an old queued revisit cannot replace a newer visit during deletion', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  const clearing = state.clear()
  state.remember({ ...first, generation: 1 })
  state.remember(first)
  pending.resolve(1)
  expect(await clearing).toBe(true)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([first.url])
})

test('a delayed old batch cannot evict the fresh visit while clear is pending', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  const clearing = state.clear()
  state.remember({ ...first, generation: 1 })
  for (let index = 0; index < 50; index++)
    state.remember({ url: `https://example.test/old/${index}`, generation: 0 })
  pending.resolve(1)
  expect(await clearing).toBe(true)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([first.url])
})

test('a buffered old visit stays behind a newer visit when removing another URL', async () => {
  const pending = createDeferred<number>()
  const { state } = fixture(() => pending.promise)
  state.remember({ url: 'https://example.test/remove', generation: 0 })
  const removing = state.remove('https://example.test/remove')
  state.remember({ ...first, generation: 1 })
  state.remember(second)
  pending.resolve(1)
  expect(await removing).toBe(true)
  expect(state.entries.value.map((entry) => entry.url)).toEqual([first.url, second.url])
})
