import 'fake-indexeddb/auto'
import { afterEach, expect, spyOn, test } from 'bun:test'

import { nextTick } from 'vue'

import { IORegistry, type ExportResult } from '@open-pencil/core/io'

import * as targets from '@/app/document/io/save/targets'
import { createEditorStore } from '@/app/editor/session/create'
import { createDeferred } from '@/app/runtime/deferred'

import { asDouble } from '#tests/helpers/doubles'

const restores: Array<() => void> = []
afterEach(() => {
  for (const restore of restores.splice(0)) restore()
})

function encoded(value: string): ExportResult {
  return { format: 'pen', mimeType: 'application/json', extension: 'pen', data: value }
}

function handle(name: string, write: (value: string) => Promise<void>) {
  return asDouble<FileSystemFileHandle>({
    name,
    kind: 'file',
    getFile: async () => new File(['{}'], name),
    createWritable: async () => ({
      write: async (bytes: Uint8Array) => write(new TextDecoder().decode(bytes)),
      close: async () => undefined
    })
  })
}

test('a slow Save writes its original destination before Save As changes the source', async () => {
  const store = createEditorStore()
  const firstBuild = createDeferred<ExportResult>()
  const oldWrites: string[] = []
  const newWrites: string[] = []
  const oldHandle = handle('old.pen', async (value) => {
    oldWrites.push(value)
  })
  const newHandle = handle('new.pen', async (value) => {
    newWrites.push(value)
  })
  const build = spyOn(IORegistry.prototype, 'writeDocument')
    .mockImplementationOnce(() => firstBuild.promise)
    .mockResolvedValue(encoded('new revision'))
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle').mockResolvedValue(newHandle)
  restores.push(
    () => build.mockRestore(),
    () => picker.mockRestore()
  )
  try {
    store.setDocumentSource('old.pen', 'pen', oldHandle)
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { width: 10, height: 10 })
    const first = store.saveFigFile()
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { width: 20, height: 20 })
    const second = store.saveFigFileAs()
    await Bun.sleep(0)
    firstBuild.resolve(encoded('old revision'))
    expect(await Promise.all([first, second])).toEqual([true, true])
    expect(oldWrites).toEqual(['old revision'])
    expect(newWrites).toEqual(['new revision'])
    expect(store.getSourceIdentity().handle).toBe(newHandle)
    expect(store.hasUnsavedChanges()).toBe(false)
  } finally {
    firstBuild.resolve(encoded('old revision'))
    store.dispose()
  }
})

test('a failed Save As cannot roll back the destination established by a later Save As', async () => {
  const store = createEditorStore()
  const writeStarted = createDeferred<undefined>()
  const failedWrite = createDeferred<undefined>()
  const oldWrites: string[] = []
  const finalWrites: string[] = []
  const oldHandle = handle('old.pen', async (value) => {
    oldWrites.push(value)
  })
  const refusedHandle = handle('failed.pen', async () => {
    writeStarted.resolve(undefined)
    await failedWrite.promise
  })
  const finalHandle = handle('final.pen', async (value) => {
    finalWrites.push(value)
  })
  let revision = 0
  const build = spyOn(IORegistry.prototype, 'writeDocument').mockImplementation(async () =>
    encoded(String(++revision))
  )
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle')
    .mockResolvedValueOnce(refusedHandle)
    .mockResolvedValueOnce(finalHandle)
  restores.push(
    () => build.mockRestore(),
    () => picker.mockRestore()
  )
  try {
    store.setDocumentSource('old.pen', 'pen', oldHandle)
    const first = store.saveFigFileAs()
    await writeStarted.promise
    const second = store.saveFigFileAs()
    await Bun.sleep(0)
    failedWrite.reject(new Error('Disk write failed'))
    expect(await Promise.all([first, second])).toEqual([false, true])
    expect(await store.saveFigFile()).toBe(true)
    expect(oldWrites).toEqual([])
    expect(finalWrites).toEqual(['2', '3'])
    expect(store.getSourceIdentity().handle).toBe(finalHandle)
  } finally {
    store.dispose()
  }
})

test('autosave waits behind a manual save and completes before the queued Save As', async () => {
  const store = createEditorStore()
  const firstBuild = createDeferred<ExportResult>()
  const oldWrites: string[] = []
  const newWrites: string[] = []
  const oldHandle = handle('old.pen', async (value) => {
    oldWrites.push(value)
  })
  const newHandle = handle('new.pen', async (value) => {
    newWrites.push(value)
  })
  const build = spyOn(IORegistry.prototype, 'writeDocument')
    .mockImplementationOnce(() => firstBuild.promise)
    .mockResolvedValue(encoded('new revision'))
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle').mockResolvedValue(newHandle)
  restores.push(
    () => build.mockRestore(),
    () => picker.mockRestore()
  )
  try {
    store.setDocumentSource('old.pen', 'pen', oldHandle)
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { width: 10, height: 10 })
    const manual = store.saveFigFile()
    store.state.autosaveEnabled = true
    store.graph.createNode('RECTANGLE', store.state.currentPageId, { width: 20, height: 20 })
    // Let the real autosave debounce request a save while the first encoder is still pending.
    await nextTick()
    await Bun.sleep(3100)
    const saveAs = store.saveFigFileAs()
    await Bun.sleep(0)
    firstBuild.resolve(encoded('old revision'))
    expect(await Promise.all([manual, saveAs])).toEqual([true, true])
    expect(build).toHaveBeenCalledTimes(3)
    expect(oldWrites).toEqual(['old revision', 'new revision'])
    expect(newWrites).toEqual(['new revision'])
    expect(store.getSourceIdentity().handle).toBe(newHandle)
    expect(store.hasUnsavedChanges()).toBe(false)
  } finally {
    firstBuild.resolve(encoded('old revision'))
    store.dispose()
  }
}, 6000)
