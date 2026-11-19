import { afterEach, describe, expect, test } from 'bun:test'

import { saveExportedFile } from '@/app/document/export/files'
import { watchTauriFile } from '@/app/document/io/watch/targets'
import { chooseTauriOpenPaths, readTauriDesignFile } from '@/app/shell/menu/files'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
  Reflect.deleteProperty(globalThis, 'window')
})

describe('Tauri file actions', () => {
  test('chooses multiple design files through plugin-dialog', async () => {
    await mockTauriIPC((cmd, args) => {
      expect(cmd).toBe('plugin:dialog|open')
      expect(args).toEqual({
        options: {
          filters: [
            {
              name: 'Design file',
              extensions: [
                'fig',
                'jam',
                'sketch',
                'pen',
                'drawio',
                'dio',
                'mmd',
                'mermaid',
                'html',
                'htm',
                'xhtml'
              ]
            }
          ],
          multiple: true
        }
      })
      return ['/tmp/design.fig', '/tmp/design.pen']
    })

    await expect(chooseTauriOpenPaths()).resolves.toEqual(['/tmp/design.fig', '/tmp/design.pen'])
  })

  test('rejects unsupported Tauri design files before reading them', async () => {
    await expect(readTauriDesignFile('/tmp/design.unsupported')).rejects.toThrow(
      'Unsupported document format: /tmp/design.unsupported'
    )
  })

  test('reads a Tauri design file into a File object', async () => {
    await mockTauriIPC((cmd, args) => {
      expect(cmd).toBe('plugin:fs|read_file')
      expect(args).toEqual({ path: '/tmp/design.pen', options: undefined })
      return [123, 34, 97, 34, 58, 49, 125]
    })

    const file = await readTauriDesignFile('/tmp/design.pen')

    expect(file.name).toBe('design.pen')
    await expect(file.text()).resolves.toBe('{"a":1}')
  })

  test('names a file read from a Windows path by its last segment', async () => {
    await mockTauriIPC(() => [123, 125])

    const file = await readTauriDesignFile('C:\\Users\\me\\Design File.pen')

    expect(file.name).toBe('Design File.pen')
  })

  test('saves exports through Tauri dialog and fs APIs', async () => {
    const calls: Array<{ cmd: string; args: unknown; options: unknown }> = []
    await mockTauriIPC((cmd, args, options) => {
      calls.push({ cmd, args, options })
      if (cmd === 'plugin:dialog|save') return '/tmp/export.png'
      return null
    })

    await saveExportedFile(
      new Uint8Array([1, 2, 3]),
      'Export@1x.png',
      'PNG',
      '.png',
      'image/png',
      () => {
        throw new Error('browser download should not run in Tauri')
      }
    )

    expect(calls[0]).toEqual({
      cmd: 'plugin:dialog|save',
      args: {
        options: {
          defaultPath: 'Export@1x.png',
          filters: [{ name: 'PNG', extensions: ['png'] }]
        }
      },
      options: undefined
    })
    expect(calls[1]?.cmd).toBe('plugin:fs|write_file')
    expect([...new Uint8Array(calls[1]?.args as ArrayBuffer)]).toEqual([1, 2, 3])
    expect(calls[1]?.options).toEqual({
      headers: { path: '%2Ftmp%2Fexport.png', options: undefined }
    })
  })

  test('watches Tauri files and ignores recent local writes', async () => {
    const watcher: { onEvent: ((event: unknown) => void) | null } = { onEvent: null }
    const calls: string[] = []
    let lastWrite = 0
    await mockTauriIPC((cmd, args) => {
      if (cmd === 'plugin:path|resolve') {
        expect(args).toEqual({ paths: ['/tmp/design.fig'] })
        return '/tmp/design.fig'
      }
      if (cmd === 'plugin:path|dirname') {
        expect(args).toEqual({ path: '/tmp/design.fig' })
        return '/tmp'
      }
      if (cmd === 'plugin:path|basename') return 'design.fig'
      if (cmd === 'plugin:fs|stat') {
        expect(args).toEqual({ path: '/tmp', options: undefined })
        throw new Error('Directory identity unavailable')
      }
      if (cmd === 'plugin:fs|watch') {
        expect(args).toMatchObject({
          paths: ['/tmp'],
          options: { delayMs: 500 }
        })
        watcher.onEvent = (
          args as { onEvent: { onmessage: (event: unknown) => void } }
        ).onEvent.onmessage
        return 7
      }
      expect(cmd).toBe('plugin:resources|close')
      expect(args).toEqual({ rid: 7 })
      calls.push(cmd)
      return null
    })

    const unwatch = await watchTauriFile(
      '/tmp/design.fig',
      () => lastWrite,
      () => calls.push('reload')
    )
    watcher.onEvent?.({ type: { modify: { kind: 'data' } }, paths: ['/tmp/design.fig'] })
    expect(calls).toEqual(['reload'])
    watcher.onEvent?.({
      type: { modify: { kind: 'rename', mode: 'both' } },
      paths: ['/tmp/replacement', '/tmp/design.fig']
    })
    expect(calls).toEqual(['reload', 'reload'])
    calls.length = 0
    watcher.onEvent?.({
      type: { access: { kind: 'open', mode: 'read' } },
      paths: ['/tmp/design.fig']
    })
    watcher.onEvent?.({ type: 'any', paths: ['/tmp/sibling.fig'] })
    lastWrite = Date.now()
    watcher.onEvent?.({ type: 'any', paths: ['/tmp/design.fig'] })
    expect(calls).toEqual([])

    unwatch()
    expect(calls).toEqual(['plugin:resources|close'])
    lastWrite = 0
    watcher.onEvent?.({ type: 'any', paths: ['/tmp/design.fig'] })
    expect(calls).toEqual(['plugin:resources|close'])
  })
})
