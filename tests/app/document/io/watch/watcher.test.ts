import { afterEach, expect, spyOn, test } from 'bun:test'

import * as targets from '@/app/document/io/watch/targets'
import { createFileWatcher } from '@/app/document/io/watch/watcher'
import { createDeferred } from '@/app/runtime/deferred'

import { expectDefined } from '#tests/helpers/assert'
import { asDouble } from '#tests/helpers/doubles'

const restores: Array<() => void> = []
afterEach(() => {
  for (const restore of restores.splice(0)) restore()
})

function watcher(reloadFromDisk = () => undefined) {
  return createFileWatcher({
    getFilePath: () => null,
    getFileHandle: () => asDouble<FileSystemFileHandle>({ name: 'owned.pen' }),
    getLastWriteTime: () => 0,
    reloadFromDisk
  })
}

test('stopping a pending subscription releases it when setup eventually resolves', async () => {
  const setup = createDeferred<() => void>()
  const watch = spyOn(targets, 'watchBrowserFile').mockImplementation(() => setup.promise)
  restores.push(() => watch.mockRestore())
  const files = watcher()
  let released = 0
  const opening = files.startWatchingFile()
  files.stopWatchingFile()
  setup.resolve(() => {
    released++
  })
  await opening
  expect(released).toBe(1)
  files.stopWatchingFile()
  expect(released).toBe(1)
})

test('late setup cannot replace or release the current file subscription', async () => {
  const old = createDeferred<() => void>()
  let oldReleased = 0
  let currentReleased = 0
  const watch = spyOn(targets, 'watchBrowserFile')
    .mockImplementationOnce(() => old.promise)
    .mockResolvedValue(() => {
      currentReleased++
    })
  restores.push(() => watch.mockRestore())
  const files = watcher()
  const opening = files.startWatchingFile()
  await files.startWatchingFile()
  old.resolve(() => {
    oldReleased++
  })
  await opening
  expect(oldReleased).toBe(1)
  expect(currentReleased).toBe(0)
  files.stopWatchingFile()
  expect(currentReleased).toBe(1)
})

test('callbacks from a retired subscription cannot reload or stop its replacement', async () => {
  const callbacks: Array<{ reload: () => void; stop: () => void }> = []
  const released: number[] = []
  const watch = spyOn(targets, 'watchBrowserFile').mockImplementation(async (...args) => {
    const index = callbacks.length
    callbacks.push({ reload: args[3], stop: args[4] })
    return () => {
      released.push(index)
    }
  })
  restores.push(() => watch.mockRestore())
  let reloads = 0
  const files = watcher(() => {
    reloads++
  })
  await files.startWatchingFile()
  await files.startWatchingFile()
  const first = expectDefined(callbacks[0], 'first subscription')
  const current = expectDefined(callbacks[1], 'current subscription')
  first.reload()
  first.stop()
  expect(reloads).toBe(0)
  expect(released).toEqual([0])
  current.reload()
  expect(reloads).toBe(1)
  current.stop()
  expect(released).toEqual([0, 1])
})
