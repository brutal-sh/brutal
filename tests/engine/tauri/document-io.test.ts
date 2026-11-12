import { afterEach, expect, test } from 'bun:test'

import { readReloadSource } from '@/app/document/io/reload/source'
import { chooseTauriDocumentSavePath } from '@/app/document/io/save/targets'
import { createDocumentWriter } from '@/app/document/io/write'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
  Reflect.deleteProperty(globalThis, 'window')
})

test('reads reload source bytes through plugin-fs', async () => {
  const fixture = await Bun.file('tests/fixtures/circle-text.fig').arrayBuffer()
  await mockTauriIPC((cmd, args) => {
    expect(cmd).toBe('plugin:fs|read_file')
    expect(args).toEqual({ path: '/tmp/document.fig', options: undefined })
    return [...new Uint8Array(fixture)]
  })

  const document = await readReloadSource({
    documentName: 'document',
    filePath: '/tmp/document.fig',
    fileHandle: null
  })

  expect(document?.getPages().length).toBeGreaterThan(0)
})

test('writes document bytes through plugin-fs', async () => {
  const calls: Array<{ cmd: string; args: unknown; options: unknown }> = []
  await mockTauriIPC((cmd, args, options) => {
    calls.push({ cmd, args, options })
    return null
  })
  const savedVersions: number[] = []
  const write = createDocumentWriter({
    state: { documentName: 'Document' },
    getFilePath: () => '/tmp/document.fig',
    getFileHandle: () => null,
    getStorageBinding: () => null,
    setSavedVersion: (version) => savedVersions.push(version),
    setLastWriteTime: () => undefined
  })

  await write(new Uint8Array([1, 2, 3]), 42)

  expect(calls).toHaveLength(1)
  expect(calls[0]?.cmd).toBe('plugin:fs|write_file')
  expect([...new Uint8Array(calls[0]?.args as ArrayBuffer)]).toEqual([1, 2, 3])
  expect(calls[0]?.options).toEqual({
    headers: { path: '%2Ftmp%2Fdocument.fig', options: undefined }
  })
  expect(savedVersions).toEqual([42])
})

test('keeps a completed write successful when recovery cleanup fails', async () => {
  await mockTauriIPC(() => null)
  const savedVersions: number[] = []
  const write = createDocumentWriter({
    state: { documentName: 'Document' },
    getFilePath: () => '/tmp/document.fig',
    getFileHandle: () => null,
    getStorageBinding: () => null,
    setSavedVersion: (version) => savedVersions.push(version),
    setLastWriteTime: () => undefined,
    onWriteSuccess: () => Promise.reject(new Error('IndexedDB blocked'))
  })

  await expect(write(new Uint8Array([1]), 17)).resolves.toBe(true)
  expect(savedVersions).toEqual([17])
})

test.each([
  {
    suggestedName: undefined,
    defaultPath: 'Untitled.pen',
    filters: [
      { name: 'Pen file', extensions: ['pen'] },
      { name: 'Figma file', extensions: ['fig'] }
    ]
  },
  {
    suggestedName: 'Existing.fig',
    defaultPath: 'Existing.fig',
    filters: [
      { name: 'Figma file', extensions: ['fig'] },
      { name: 'Pen file', extensions: ['pen'] }
    ]
  }
])('chooses a Tauri save path for $defaultPath through plugin-dialog', async (fixture) => {
  await mockTauriIPC((cmd, args) => {
    expect(cmd).toBe('plugin:dialog|save')
    expect(args).toEqual({
      options: {
        defaultPath: fixture.defaultPath,
        filters: fixture.filters
      }
    })
    return `/tmp/${fixture.defaultPath}`
  })

  await expect(chooseTauriDocumentSavePath(fixture.suggestedName)).resolves.toBe(
    `/tmp/${fixture.defaultPath}`
  )
})

test('keeps a cancelled native save cancelled', async () => {
  await mockTauriIPC(() => null)
  await expect(chooseTauriDocumentSavePath()).resolves.toBeNull()
})
