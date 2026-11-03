import { afterEach, expect, test } from 'bun:test'

import { saveExportedFile } from '@/app/document/export/files'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
  Reflect.deleteProperty(globalThis, 'window')
})

test.each([false, true])(
  'saves an explicit export destination without a dialog (exists: %s)',
  async (exists) => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:fs|lstat') {
        if (!exists) throw new Error('File not found')
        return { isFile: true, isSymlink: false }
      }
      return null
    })
    const saved = await saveExportedFile(
      new Uint8Array([1, 2, 3]),
      'design-export.html',
      'HTML',
      '.html',
      'text/html',
      () => {
        throw new Error('Unexpected browser download')
      },
      '/tmp/design-export.html'
    )
    expect(saved).toBe(true)
    expect(calls).toEqual(['plugin:fs|lstat', 'plugin:fs|write_file'])
  }
)

test.each([
  { isFile: true, isSymlink: true },
  { isFile: false, isSymlink: false }
])('refuses an automatic export over a link or non-file: %j', async (info) => {
  const calls: string[] = []
  await mockTauriIPC((cmd) => {
    calls.push(cmd)
    if (cmd === 'plugin:fs|lstat') return info
    throw new Error('Unexpected file write or dialog')
  })
  await expect(
    saveExportedFile(
      new Uint8Array([1]),
      'design-export.html',
      'HTML',
      '.html',
      'text/html',
      () => {
        throw new Error('Unexpected browser download')
      },
      '/tmp/design-export.html'
    )
  ).rejects.toThrow('Choose a regular file')
  expect(calls).toEqual(['plugin:fs|lstat'])
})

test('cancelling the export Save dialog writes nothing', async () => {
  const calls: string[] = []
  await mockTauriIPC((cmd) => {
    calls.push(cmd)
    if (cmd === 'plugin:dialog|save') return null
    throw new Error('Unexpected export operation')
  })
  await expect(
    saveExportedFile(
      new Uint8Array([1]),
      'design-export.html',
      'HTML',
      '.html',
      'text/html',
      () => {
        throw new Error('Unexpected browser download')
      }
    )
  ).resolves.toBe(false)
  expect(calls).toEqual(['plugin:dialog|save'])
})

test('automatic export write failures reach the caller without a second destination', async () => {
  const calls: string[] = []
  await mockTauriIPC((cmd) => {
    calls.push(cmd)
    if (cmd === 'plugin:fs|lstat') throw new Error('File not found')
    throw new Error('Export destination is not writable')
  })
  await expect(
    saveExportedFile(
      new Uint8Array([1]),
      'design-export.html',
      'HTML',
      '.html',
      'text/html',
      () => {
        throw new Error('Unexpected browser download')
      },
      '/tmp/design-export.html'
    )
  ).rejects.toThrow('not writable')
  expect(calls).toEqual(['plugin:fs|lstat', 'plugin:fs|write_file'])
})
