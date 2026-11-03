import { expect, test } from 'bun:test'

import { createBrowserPickerController } from '@/app/browser-preview/picker/controller'
import { validateBrowserPicker, type BrowserPickerState } from '@/app/browser-preview/picker/schema'
import { createDeferred } from '@/app/runtime/deferred'

const packet: BrowserPickerState = {
  requestId: '00000000-0000-4000-8000-000000000000',
  url: 'https://example.test/',
  picking: true,
  pick: null,
  action: null
}

test('local export picker responses require exact explicit URL authorization and request identity', () => {
  const url = 'file:///design/owned-export.html'
  const response = { ...packet, url }
  expect(() => validateBrowserPicker(response, packet.requestId, url)).toThrow()
  expect(validateBrowserPicker(response, packet.requestId, url, url).url).toBe(url)
  expect(() =>
    validateBrowserPicker(
      { ...response, url: 'file:///design/another.html' },
      packet.requestId,
      url,
      url
    )
  ).toThrow()
  expect(() => validateBrowserPicker(response, crypto.randomUUID(), url, url)).toThrow('changed')
})

test('a reply from a previous page cannot restore its picker or trigger an import', async () => {
  const response = createDeferred<BrowserPickerState>()
  let url = packet.url
  let imports = 0
  const picker = createBrowserPickerController(
    () => response.promise,
    () => url,
    () => false,
    () => {
      imports++
    }
  )
  const starting = picker.start()
  url = 'https://example.test/new'
  picker.reset()
  response.resolve({ ...packet, action: 'import' })
  await starting
  expect(picker.state.value).toBeNull()
  expect(imports).toBe(0)
})

test('a failed picker action retains feedback and can be retried without overlapping polls', async () => {
  const response = createDeferred<BrowserPickerState>()
  let calls = 0
  const picker = createBrowserPickerController(
    () => {
      calls++
      return calls === 1 ? response.promise : Promise.resolve(packet)
    },
    () => packet.url,
    () => false,
    () => undefined
  )
  const starting = picker.start()
  await picker.refresh()
  expect(calls).toBe(1)
  response.reject(new Error('Unavailable page'))
  await starting
  expect(picker.error.value).toBeTruthy()
  await picker.start()
  expect(picker.state.value?.picking).toBe(true)
  expect(picker.error.value).toBe('')
})

test('disposal clears the page picker and ignores its pending reply', async () => {
  const response = createDeferred<BrowserPickerState>()
  const calls: string[] = []
  const picker = createBrowserPickerController(
    (_url, action) => {
      calls.push(action)
      return action === 'stop' ? Promise.resolve({ ...packet, picking: false }) : response.promise
    },
    () => packet.url,
    () => false,
    () => undefined
  )
  const starting = picker.start()
  picker.dispose()
  response.resolve(packet)
  await starting
  expect(calls).toEqual(['start', 'stop'])
  expect(picker.state.value).toBeNull()
})

test('stopping during a pending poll wins over the older response', async () => {
  const response = createDeferred<BrowserPickerState>()
  const calls: string[] = []
  const picker = createBrowserPickerController(
    (_url, action) => {
      calls.push(action)
      return action === 'stop' ? Promise.resolve({ ...packet, picking: false }) : response.promise
    },
    () => packet.url,
    () => false,
    () => undefined
  )
  const starting = picker.start()
  await picker.stop()
  response.resolve(packet)
  await starting
  expect(calls).toEqual(['start', 'stop'])
  expect(picker.state.value?.picking).toBe(false)
})

test('a late picker failure after disposal cannot restore feedback', async () => {
  const response = createDeferred<BrowserPickerState>()
  const picker = createBrowserPickerController(
    (_url, action) => (action === 'stop' ? Promise.resolve(packet) : response.promise),
    () => packet.url,
    () => false,
    () => {
      throw new Error('Disposed action')
    }
  )
  const starting = picker.start()
  picker.dispose()
  response.reject(new Error('Late page failure'))
  await starting
  expect(picker.error.value).toBe('')
  expect(picker.state.value).toBeNull()
  expect(picker.pending.value).toBe(false)
})

test('a recovered poll clears its transient error after a reload', async () => {
  let fails = true
  const picker = createBrowserPickerController(
    async () => {
      if (fails) throw new Error('Page loading')
      return { ...packet, picking: false }
    },
    () => packet.url,
    () => false,
    () => undefined
  )
  await picker.refresh()
  expect(picker.error.value).toBeTruthy()
  fails = false
  await picker.refresh()
  expect(picker.error.value).toBe('')
  expect(picker.state.value?.picking).toBe(false)
})
