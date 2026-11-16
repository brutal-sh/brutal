import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test, vi } from 'bun:test'

import { handleURISave } from '@/app/automation/bridge/save-uri'
import { automationFiles } from '@/app/automation/bridge/server'
import type { AutomationTarget } from '@/app/automation/bridge/target'
import { createDeferred } from '@/app/runtime/deferred'
import { closeTab, createTab, getActiveTabId } from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'

const ownedTabs: string[] = []

beforeEach(() => {
  globalThis.window = asDouble<Window & typeof globalThis>({
    innerWidth: 800,
    innerHeight: 600,
    openPencil: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const id of ownedTabs.splice(0)) await closeTab(id, 'discard')
  Reflect.deleteProperty(globalThis, 'window')
})

function documentAt(path: string) {
  const tab = createTab()
  ownedTabs.push(tab.id)
  tab.store.setDocumentSource('owned.pen', 'pen', undefined, path)
  return tab
}

function saveRecorder() {
  return vi.fn(async (_target: AutomationTarget, _args: unknown) => ({
    ok: true,
    result: { saved: true }
  }))
}

test('URI save binds its background document and preserves the active tab', async () => {
  const first = documentAt('/owned/first.pen')
  const second = documentAt('/owned/second.pen')
  const save = saveRecorder()
  await handleURISave({ paths: ['/owned/first.pen'] }, { save })
  expect(save).toHaveBeenCalledTimes(1)
  expect(save.mock.calls[0]?.[0].store).toBe(first.store)
  expect(getActiveTabId()).toBe(second.id)
})

test('browser URI save writes through the existing source URL', async () => {
  const files = automationFiles('ws://owned.test', 'owned-token')
  const source = '/owned/a #1.pen'
  const tab = documentAt(files.url(source).href)
  const save = saveRecorder()
  await handleURISave({ paths: [source] }, { files, save })
  expect(save.mock.calls[0]?.[0].store).toBe(tab.store)
  expect(save.mock.calls[0]?.[1]).toEqual({ path: source })
  expect(tab.store.getDocumentFilePath()).toBe(files.url(source).href)
})

test('unknown and ambiguous source paths never fall back to the active document', async () => {
  documentAt('/owned/duplicate.pen')
  documentAt('/owned/duplicate.pen')
  const save = saveRecorder()
  for (const path of ['/owned/unknown.pen', '/owned/duplicate.pen']) {
    await expect(handleURISave({ paths: [path] }, { save })).rejects.toThrow('exactly one')
  }
  expect(save).not.toHaveBeenCalled()
})

test('a read-only document is refused before loading or saving it', async () => {
  const tab = documentAt('/owned/read-only.pen')
  tab.store.setReadOnly(true)
  const prepare = vi.spyOn(tab.store, 'preparePageNodes')
  const save = saveRecorder()
  await expect(handleURISave({ paths: ['/owned/read-only.pen'] }, { save })).rejects.toThrow(
    'read-only'
  )
  expect(prepare).not.toHaveBeenCalled()
  expect(save).not.toHaveBeenCalled()
})

test('changing source during page preparation refuses Save without retargeting', async () => {
  const tab = documentAt('/owned/before.pen')
  const entered = createDeferred<undefined>()
  const release = createDeferred<boolean>()
  vi.spyOn(tab.store, 'preparePageNodes').mockImplementation(() => {
    entered.resolve(undefined)
    return release.promise
  })
  const save = saveRecorder()
  const pending = handleURISave({ paths: ['/owned/before.pen'] }, { save })
  await entered.promise
  tab.store.setDocumentSource('after.pen', 'pen', undefined, '/owned/after.pen')
  release.resolve(true)
  await expect(pending).rejects.toThrow('changed')
  expect(save).not.toHaveBeenCalled()
  expect(tab.store.getDocumentFilePath()).toBe('/owned/after.pen')
})

test('cancellation while preparing prevents the save callback', async () => {
  const tab = documentAt('/owned/cancel.pen')
  const controller = new AbortController()
  const entered = createDeferred<undefined>()
  const release = createDeferred<boolean>()
  vi.spyOn(tab.store, 'preparePageNodes').mockImplementation(() => {
    entered.resolve(undefined)
    return release.promise
  })
  const save = saveRecorder()
  const pending = handleURISave(
    { paths: ['/owned/cancel.pen'] },
    { save, signal: controller.signal }
  )
  await entered.promise
  controller.abort()
  release.resolve(true)
  await expect(pending).rejects.toThrow()
  expect(save).not.toHaveBeenCalled()
})

test('access becoming read-only during preparation refuses Save', async () => {
  const tab = documentAt('/owned/access.pen')
  const entered = createDeferred<undefined>()
  const release = createDeferred<boolean>()
  vi.spyOn(tab.store, 'preparePageNodes').mockImplementation(() => {
    entered.resolve(undefined)
    return release.promise
  })
  const save = saveRecorder()
  const pending = handleURISave({ paths: ['/owned/access.pen'] }, { save })
  await entered.promise
  tab.store.setReadOnly(true)
  release.resolve(true)
  await expect(pending).rejects.toThrow('changed')
  expect(save).not.toHaveBeenCalled()
})
