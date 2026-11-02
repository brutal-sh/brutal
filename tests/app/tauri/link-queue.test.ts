import { afterEach, expect, test } from 'bun:test'

import * as v from 'valibot'

import { createDeferred } from '@/app/runtime/deferred'
import { bindDesktopLinkQueue } from '@/app/tauri/link-queue'

import { clearTauriMocks, installTauriMockWindow } from '#tests/helpers/tauri/mocks'

afterEach(clearTauriMocks)

test('queued links are delivered in order when a newer notification arrives before the first reply', async () => {
  installTauriMockWindow()
  const { mockIPC } = await import('@tauri-apps/api/mocks')
  const { emit } = await import('@tauri-apps/api/event')
  const first = createDeferred<string[]>()
  const started = createDeferred<undefined>()
  const delivered = createDeferred<undefined>()
  let calls = 0
  const opened: string[] = []
  mockIPC(
    (command) => {
      if (command !== 'take_links') throw new Error('Unexpected command')
      calls++
      if (calls === 1) {
        started.resolve(undefined)
        return first.promise
      }
      return ['new']
    },
    { shouldMockEvents: true }
  )
  const binding = bindDesktopLinkQueue({
    event: 'links-ready',
    command: 'take_links',
    schema: v.string(),
    label: 'Fixture links',
    open: (item) => {
      opened.push(item)
      if (opened.length === 2) delivered.resolve(undefined)
    }
  })
  await started.promise
  await emit('links-ready')
  const beforeReply = calls
  first.resolve(['old'])
  const stop = await binding
  try {
    await delivered.promise
    expect(beforeReply).toBe(1)
    expect(opened).toEqual(['old', 'new'])
  } finally {
    stop()
  }
})

test('an initial queue failure removes its event listener', async () => {
  installTauriMockWindow()
  const { mockIPC } = await import('@tauri-apps/api/mocks')
  const { emit } = await import('@tauri-apps/api/event')
  let calls = 0
  mockIPC(
    () => {
      calls++
      throw new Error('Unavailable queue')
    },
    { shouldMockEvents: true }
  )
  await expect(
    bindDesktopLinkQueue({
      event: 'links-ready',
      command: 'take_links',
      schema: v.string(),
      label: 'Fixture links',
      open: () => undefined
    })
  ).rejects.toThrow('Unavailable queue')
  await emit('links-ready')
  expect(calls).toBe(1)
})
