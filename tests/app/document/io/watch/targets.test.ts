import { expect, test } from 'bun:test'

import type { WatchEventKind } from '@tauri-apps/plugin-fs'

import { sameWatchDirectory, shouldReloadFile } from '@/app/document/io/watch/targets'

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

test('watch aliases require the same directory with available, precise filesystem identities', () => {
  const directory = { dev: 1, ino: 42, isDirectory: true }
  expect(sameWatchDirectory(directory, { ...directory })).toBe(true)
  expect(sameWatchDirectory(directory, { ...directory, dev: 2 })).toBe(false)
  expect(sameWatchDirectory(directory, { ...directory, ino: 43 })).toBe(false)
  expect(sameWatchDirectory(directory, { ...directory, isDirectory: false })).toBe(false)
  expect(sameWatchDirectory({ ...directory, ino: null }, { ...directory, ino: null })).toBe(false)
  expect(sameWatchDirectory({ ...directory, ino: 0 }, { ...directory, ino: 0 })).toBe(false)
  expect(sameWatchDirectory({ ...directory, dev: null }, { ...directory, dev: null })).toBe(false)
  const imprecise = { ...directory, ino: Number.MAX_SAFE_INTEGER + 1 }
  expect(sameWatchDirectory(imprecise, imprecise)).toBe(false)
})

test('document watchers ignore metadata-only changes and still report external writes', () => {
  const path = '/design/owned.pen'
  const check = (type: WatchEventKind) =>
    shouldReloadFile({ type, paths: [path], attrs: null }, path, 0, { ignoreMetadata: true })
  const permissions = { modify: { kind: 'metadata', mode: 'ownership' } } as const
  expect(check(permissions)).toBe(false)
  expect(check({ modify: { kind: 'metadata', mode: 'any' } })).toBe(false)
  expect(check({ modify: { kind: 'data', mode: 'content' } })).toBe(true)
  expect(check({ modify: { kind: 'rename', mode: 'any' } })).toBe(true)
  expect(check({ create: { kind: 'file' } })).toBe(true)
  expect(shouldReloadFile({ type: permissions, paths: [path], attrs: null }, path, 0)).toBe(true)
})
