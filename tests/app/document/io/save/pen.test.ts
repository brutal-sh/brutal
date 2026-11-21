import 'fake-indexeddb/auto'
import { afterEach, expect, spyOn, test } from 'bun:test'

import * as nativeFS from '@tauri-apps/plugin-fs'

import { createDefaultEditorState } from '@open-pencil/core'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { SceneGraph } from '@open-pencil/scene-graph'

import { readReloadSource } from '@/app/document/io/reload/source'
import { createSaveActions } from '@/app/document/io/save/actions'
import { documentSaveFormat } from '@/app/document/io/save/format'
import * as targets from '@/app/document/io/save/targets'
import { createDocumentSourceState } from '@/app/document/io/source/state'
import { createDocumentWriter } from '@/app/document/io/write'
import { createEditorStore } from '@/app/editor/session/create'
import { recentDocuments } from '@/app/recent-files'
import * as nativeEnvironment from '@/app/tauri/env'

import { asDouble } from '#tests/helpers/doubles'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const restores: Array<() => void> = []
afterEach(() => {
  for (const restore of restores.splice(0)) restore()
})

function fileHandle(name: string, written: Uint8Array[], file?: File) {
  return asDouble<FileSystemFileHandle>({
    name,
    kind: 'file',
    getFile: async () => file ?? new File(['{}'], name),
    createWritable: async () => ({
      write: async (bytes: Uint8Array) => {
        written.push(bytes)
      },
      close: async () => undefined
    })
  })
}

function harness() {
  const source = createDocumentSourceState()
  const state = {
    ...createDefaultEditorState('page'),
    documentName: 'Existing'
  }
  const written: Uint8Array[] = []
  const original = fileHandle('existing.fig', written)
  source.setFileHandle(original)
  source.setDownloadName('existing.fig')
  source.setSourceIdentity({ handle: original, path: null })
  return { source, state, written, original }
}

test('Save writes an imported .pen in place with the real Core writer and readable bytes', async () => {
  const store = createEditorStore()
  const written: Uint8Array[] = []
  const handle = fileHandle('design.pen', written)
  try {
    store.setDocumentSource('design.pen', 'pen', handle)
    store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Saved slide',
      width: 640,
      height: 360
    })
    expect(store.hasWritableSource()).toBe(true)
    expect(store.hasUnsavedChanges()).toBe(true)
    expect(await store.saveFigFile()).toBe(true)
    expect(written).toHaveLength(1)
    const imported = await io.readDocument({
      name: 'design.pen',
      data: written[0]
    })
    expect(imported.sourceFormat).toBe('pen')
    expect(imported.graph.getChildren(imported.graph.getPages()[0].id)[0].name).toBe('Saved slide')
    expect(store.hasUnsavedChanges()).toBe(false)
    expect(store.getSourceIdentity().handle).toBe(handle)
  } finally {
    store.dispose()
  }
})

test('a new document defaults to .brut and writes editable geometry on its first Save', async () => {
  const store = createEditorStore()
  const written: Uint8Array[] = []
  const handle = fileHandle('Untitled.brut', written)
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle').mockResolvedValue(handle)
  restores.push(() => picker.mockRestore())
  try {
    store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'First save',
      width: 160,
      height: 80
    })
    expect(await store.saveFigFile()).toBe(true)
    expect(picker).toHaveBeenCalledWith('Untitled.brut')
    expect(written).toHaveLength(1)
    const reopened = await io.readDocument({
      name: handle.name,
      data: written[0]
    })
    expect(reopened.sourceFormat).toBe('pen')
    expect(reopened.graph.getChildren(reopened.graph.getPages()[0].id)[0]).toMatchObject({
      type: 'RECTANGLE',
      name: 'First save',
      width: 160,
      height: 80
    })
    expect(store.hasUnsavedChanges()).toBe(false)
  } finally {
    store.dispose()
  }
})

test('a loss refusal leaves the .pen file untouched and the document dirty', async () => {
  const store = createEditorStore()
  const written: Uint8Array[] = []
  const handle = fileHandle('design.pen', written)
  try {
    store.setDocumentSource('design.pen', 'pen', handle)
    store.graph.addPage('Second page')
    expect(await store.saveFigFile()).toBe(false)
    expect(written).toEqual([])
    expect(store.hasUnsavedChanges()).toBe(true)
    expect(store.getSourceIdentity().handle).toBe(handle)
  } finally {
    store.dispose()
  }
})

test('Save As chooses .pen encoding, but a refused export preserves the previous target', async () => {
  const { source, state, written, original } = harness()
  const chosen = fileHandle('new.pen', written)
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle').mockResolvedValue(chosen)
  restores.push(() => picker.mockRestore())
  let figBuilds = 0
  const actions = createSaveActions({
    ...source,
    state,
    version: () => 3,
    buildFigFile: () => {
      figBuilds++
      return new Uint8Array([1])
    },
    buildPenFile: () => {
      throw new Error('Unsupported feature')
    },
    startWatchingFile: () => undefined
  })
  await expect(actions.saveFigFileAs()).rejects.toThrow('Unsupported feature')
  expect(figBuilds).toBe(0)
  expect(written).toEqual([])
  expect(source.getFileHandle()).toBe(original)
  expect(source.getDownloadName()).toBe('existing.fig')
  expect(source.getSavedVersion()).toBe(0)
  expect(state.documentName).toBe('Existing')
})

test('cancelling the picker does not encode, download or retarget the document', async () => {
  const { source, state, written, original } = harness()
  const picker = spyOn(targets, 'chooseBrowserDocumentSaveHandle').mockRejectedValue(
    new DOMException('Cancelled', 'AbortError')
  )
  restores.push(() => picker.mockRestore())
  let built = false
  const actions = createSaveActions({
    ...source,
    state,
    version: () => 3,
    buildFigFile: () => {
      built = true
      return new Uint8Array([1])
    },
    startWatchingFile: () => undefined
  })
  expect(await actions.saveFigFileAs()).toBe(false)
  expect(built).toBe(false)
  expect(written).toEqual([])
  expect(source.getFileHandle()).toBe(original)
})

test('the final writer rejects FIG bytes directed at a .pen destination', async () => {
  const source = createDocumentSourceState()
  const written: Uint8Array[] = []
  source.setFileHandle(fileHandle('design.pen', written))
  const writer = createDocumentWriter({
    ...source,
    state: { documentName: 'Design' }
  })
  await expect(writer(new Uint8Array([1]), 2, 'fig')).rejects.toThrow('changed format')
  expect(written).toEqual([])
  expect(source.getSavedVersion()).toBe(0)
})

test('reload reads the actual .pen format from a browser file handle', async () => {
  const graph = new SceneGraph()
  graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    name: 'Reloaded',
    width: 100,
    height: 50
  })
  const result = await io.writeDocument('pen', graph)
  const file = new File(
    [typeof result.data === 'string' ? result.data : new Uint8Array(result.data)],
    'design.pen'
  )
  const reloaded = await readReloadSource({
    documentName: 'Design',
    filePath: null,
    fileHandle: fileHandle('design.pen', [], file)
  })
  expect(reloaded?.getChildren(reloaded.getPages()[0].id)[0].name).toBe('Reloaded')
})

test('local format selection rejects unrelated extensions and accepts case-insensitive PEN', () => {
  expect(documentSaveFormat('drawing.BRUT')).toBe('pen')
  expect(documentSaveFormat('drawing.PEN')).toBe('pen')
  expect(documentSaveFormat('drawing.fig')).toBe('fig')
  expect(documentSaveFormat('Untitled')).toBe('fig')
  expect(() => documentSaveFormat('drawing.png')).toThrow('.brut, .pen, or .fig')
})

test('autosave writes .pen bytes after a real document edit', async () => {
  const store = createEditorStore()
  const written: Uint8Array[] = []
  let resolveWrite: (bytes: Uint8Array) => void = () => undefined
  const write = new Promise<Uint8Array>((resolve) => {
    resolveWrite = resolve
  })
  const handle = fileHandle('autosave.pen', written)
  const createWritable = spyOn(handle, 'createWritable').mockImplementation(async () =>
    asDouble<FileSystemWritableFileStream>({
      write: async (bytes: Uint8Array) => {
        written.push(bytes)
        resolveWrite(bytes)
      },
      close: async () => undefined
    })
  )
  try {
    store.setDocumentSource('autosave.pen', 'pen', handle)
    store.state.autosaveEnabled = true
    store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Automatic',
      width: 40,
      height: 30
    })
    const bytes = await write
    const reopened = await io.readDocument({
      name: 'autosave.pen',
      data: bytes
    })
    expect(reopened.sourceFormat).toBe('pen')
    expect(reopened.graph.getChildren(reopened.graph.getPages()[0].id)[0].name).toBe('Automatic')
  } finally {
    createWritable.mockRestore()
    store.dispose()
  }
}, 6000)

test('storage refuses .pen encoding before persistence or a saved-version update', async () => {
  const source = createDocumentSourceState()
  source.setStorageBinding({
    providerId: 's3-compatible',
    documentId: 'stored'
  })
  const writer = createDocumentWriter({
    ...source,
    state: { documentName: 'Stored' }
  })
  await expect(writer(new Uint8Array([1]), 4, 'pen')).rejects.toThrow(
    'Storage documents must use FIG encoding'
  )
  expect(source.getSavedVersion()).toBe(0)
})

test('a successful native Save immediately remembers its local path', async () => {
  const previous = recentDocuments.value
  const native = spyOn(nativeEnvironment, 'isTauri').mockReturnValue(true)
  const write = spyOn(nativeFS, 'writeFile').mockResolvedValue(undefined)
  const store = createEditorStore()
  try {
    store.setDocumentSource('history.pen', 'pen', undefined, '/native/history.pen')
    store.createShape('RECTANGLE', 0, 0, 100, 50)
    expect(await store.saveFigFile()).toBe(true)
    expect(write).toHaveBeenCalledTimes(1)
    expect(recentDocuments.value[0]).toMatchObject({
      kind: 'local',
      path: '/native/history.pen'
    })
  } finally {
    store.dispose()
    native.mockRestore()
    write.mockRestore()
    recentDocuments.value = previous
  }
})
