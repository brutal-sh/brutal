import { expect, test } from 'bun:test'

import type { WatchEventKind } from '@tauri-apps/plugin-fs'

import { shouldReloadFile } from '@/app/document/io/watch/targets'

test('native file notifications include atomic saves without reloading on sibling access or recent self-writes', () => {
  const path = '/design/checks.glsl'
  const event = (type: WatchEventKind, paths = [path]) => ({ type, paths, attrs: null })
  expect(shouldReloadFile(event({ modify: { kind: 'data', mode: 'any' } }), path, 0)).toBe(true)
  expect(shouldReloadFile(event({ create: { kind: 'file' } }), path, 0)).toBe(true)
  expect(
    shouldReloadFile(
      event({ modify: { kind: 'rename', mode: 'both' } }, ['/design/temp', path]),
      path,
      0
    )
  ).toBe(true)
  expect(shouldReloadFile(event({ remove: { kind: 'file' } }), path, 0)).toBe(true)
  expect(shouldReloadFile(event('any'), path, 0)).toBe(true)
  expect(shouldReloadFile(event('other'), path, 0)).toBe(false)
  expect(shouldReloadFile(event({ access: { kind: 'open', mode: 'read' } }), path, 0)).toBe(false)
  expect(shouldReloadFile(event('any', ['/design/other.glsl']), path, 0)).toBe(false)
  expect(shouldReloadFile(event('any'), path, Date.now())).toBe(false)
})
