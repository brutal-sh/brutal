import { expect, jest, spyOn, test } from 'bun:test'

import { nextTick } from 'vue'

import { IORegistry } from '@open-pencil/core/io'
import * as fig from '@open-pencil/core/io/formats/fig'

import * as targets from '@/app/document/io/save/targets'
import * as watchTargets from '@/app/document/io/watch/targets'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import { resetRecoveryStoreForTests } from '@/app/document/recovery/store'
import { createEditorStore } from '@/app/editor/session/create'
import { createDeferred } from '@/app/runtime/deferred'

import { asDouble } from '#tests/helpers/doubles'

function fileHandleFixture() {
  const writes = new WeakMap<object, () => Promise<void>>()
  class FileHandle {
    readonly kind = 'file'
    constructor(
      readonly name: string,
      write: () => Promise<void>
    ) {
      writes.set(this, write)
    }
    async getFile() {
      return new File(['{}'], this.name, { lastModified: 1 })
    }
    async createWritable() {
      return asDouble<FileSystemWritableFileStream>({
        write: async () => writes.get(this)?.(),
        close: async () => undefined
      })
    }
  }
  return {
    constructor: FileHandle,
    handle: (name: string, write: () => Promise<void>) =>
      asDouble<FileSystemFileHandle>(new FileHandle(name, write))
  }
}

function heldSaveFixture(oldWrite: () => Promise<void> = async () => undefined) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'FileSystemFileHandle')
  const handles = fileHandleFixture()
  Reflect.defineProperty(globalThis, 'FileSystemFileHandle', {
    configurable: true,
    value: handles.constructor
  })
  const memory = createMemoryRecoveryStore()
  resetRecoveryStoreForTests(memory)
  const store = createEditorStore()
  const entered = createDeferred<undefined>()
  const release = createDeferred<undefined>()
  const oldHandle = handles.handle('old.pen', oldWrite)
  const newHandle = handles.handle('new.pen', async () => {
    entered.resolve(undefined)
    await release.promise
  })
  const encode = spyOn(IORegistry.prototype, 'writeDocument').mockResolvedValue({
    format: 'pen',
    mimeType: 'application/json',
    extension: 'pen',
    data: '{}'
  })
  const backup = spyOn(fig, 'exportFigFile').mockResolvedValue(new Uint8Array([9]))
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle').mockResolvedValue(newHandle)
  store.setDocumentSource('old.pen', 'pen', oldHandle)
  return {
    store,
    memory,
    entered: entered.promise,
    release: () => release.resolve(undefined),
    dispose: () => {
      store.dispose()
      encode.mockRestore()
      backup.mockRestore()
      picker.mockRestore()
      resetRecoveryStoreForTests()
      if (descriptor) Reflect.defineProperty(globalThis, 'FileSystemFileHandle', descriptor)
      else Reflect.deleteProperty(globalThis, 'FileSystemFileHandle')
    }
  }
}

test('Save As confirmation reschedules edits whose backup debounce expired during its write', async () => {
  jest.useFakeTimers()
  const fixture = heldSaveFixture()
  let saving: Promise<boolean> | null = null
  try {
    fixture.store.createShape('RECTANGLE', 0, 0, 10, 10)
    saving = fixture.store.saveFigFileAs()
    await fixture.entered
    fixture.store.createShape('RECTANGLE', 20, 0, 10, 10)
    await nextTick()
    jest.advanceTimersByTime(3100)
    await nextTick()
    await Promise.resolve()
    expect(await fixture.memory.list()).toEqual([])
    fixture.release()
    expect(await saving).toBe(true)
    expect(fixture.store.hasUnsavedChanges()).toBe(true)
    await nextTick()
    jest.advanceTimersByTime(3100)
    await nextTick()
    await Promise.resolve()
    const snapshot = await fixture.memory.read(fixture.store.getRecoveryId())
    expect(snapshot).toMatchObject({
      source: { fileName: 'new.pen' },
      figBytes: new Uint8Array([9])
    })
  } finally {
    fixture.release()
    if (saving) await saving
    fixture.dispose()
    jest.useRealTimers()
  }
})

test('saving restored edits resumes the owned file watcher only after the write succeeds', async () => {
  const watch = spyOn(watchTargets, 'watchBrowserFile').mockResolvedValue(() => undefined)
  const fixture = heldSaveFixture()
  try {
    await nextTick()
    const openedWatches = watch.mock.calls.length
    const identity = fixture.store.getSourceIdentity()
    fixture.store.createShape('RECTANGLE', 0, 0, 10, 10)
    await fixture.store.adoptRecoverySnapshot('restored', { fileName: 'old.pen', identity })
    expect(fixture.store.hasUnsavedChanges()).toBe(true)
    expect(watch.mock.calls.length).toBe(openedWatches)
    expect(await fixture.store.saveFigFile()).toBe(true)
    expect(fixture.store.hasUnsavedChanges()).toBe(false)
    expect(watch.mock.calls.length).toBe(openedWatches + 1)
    expect(watch.mock.calls.at(-1)?.[0] ?? null).toBe(identity.handle)
  } finally {
    fixture.dispose()
    watch.mockRestore()
  }
})

test('a refused recovered-file save leaves watching deferred and the edits unsaved', async () => {
  const watch = spyOn(watchTargets, 'watchBrowserFile').mockResolvedValue(() => undefined)
  const fixture = heldSaveFixture(async () => {
    throw new Error('Fixture write refused')
  })
  try {
    await nextTick()
    const openedWatches = watch.mock.calls.length
    const identity = fixture.store.getSourceIdentity()
    fixture.store.createShape('RECTANGLE', 0, 0, 10, 10)
    await fixture.store.adoptRecoverySnapshot('restored', { fileName: 'old.pen', identity })
    expect(await fixture.store.saveFigFile()).toBe(false)
    expect(fixture.store.hasUnsavedChanges()).toBe(true)
    expect(watch.mock.calls.length).toBe(openedWatches)
  } finally {
    fixture.dispose()
    watch.mockRestore()
  }
})

test('watch setup failure does not turn a completed recovered-file write into a failed save', async () => {
  const watch = spyOn(watchTargets, 'watchBrowserFile')
    .mockResolvedValueOnce(() => undefined)
    .mockRejectedValueOnce(new Error('Fixture watch setup refused'))
    .mockResolvedValue(() => undefined)
  const fixture = heldSaveFixture()
  try {
    await nextTick()
    const identity = fixture.store.getSourceIdentity()
    fixture.store.createShape('RECTANGLE', 0, 0, 10, 10)
    await fixture.store.adoptRecoverySnapshot('restored', { fileName: 'old.pen', identity })
    expect(await fixture.store.saveFigFile()).toBe(true)
    expect(fixture.store.hasUnsavedChanges()).toBe(false)
    expect(watch.mock.calls.length).toBe(2)
    expect(await fixture.store.saveFigFile()).toBe(true)
    expect(watch.mock.calls.length).toBe(3)
  } finally {
    fixture.dispose()
    watch.mockRestore()
  }
})
