import { expect, test } from 'bun:test'

import { parseBrowserHistory, recordBrowserHistory } from '@/app/browser-preview/history/model'
import type { BrowserHistoryEntry } from '@/app/browser-preview/history/schema'

const first = { url: 'https://example.test/first', visitedAt: 1 }
const second = { url: 'http://localhost:8080/second', visitedAt: 2 }

test('retains fifty unique visits, moves revisits first and ignores an immediate repeat', () => {
  let entries: readonly BrowserHistoryEntry[] = []
  for (let index = 0; index < 60; index++)
    entries = recordBrowserHistory(entries, `https://example.test/${index}`, index)
  expect(entries.length).toBe(50)
  expect(entries[0]?.url).toBe('https://example.test/59')
  expect(entries.at(-1)?.url).toBe('https://example.test/10')
  const revisited = recordBrowserHistory(entries, 'https://example.test/20', 100)
  expect(revisited[0]).toEqual({ url: 'https://example.test/20', visitedAt: 100 })
  expect(revisited.filter((entry) => entry.url === 'https://example.test/20').length).toBe(1)
  expect(recordBrowserHistory(revisited, 'https://example.test/20', 200)).toBe(revisited)
})

test('normalizes new web visits without retaining privileged or credential-bearing addresses', () => {
  const entries = recordBrowserHistory([], 'example.test', 1)
  expect(entries[0]?.url).toBe('https://example.test/')
  for (const url of [
    'file:///etc/hosts',
    'https://user:password@example.test/',
    'https://tauri.localhost/',
    'about:blank'
  ])
    expect(recordBrowserHistory(entries, url, 2)).toBe(entries)
})

test('recovers valid entries from stored data without admitting malformed or unsafe records', () => {
  const entries = parseBrowserHistory(
    JSON.stringify([
      first,
      { url: 'file:///etc/hosts', visitedAt: 3 },
      null,
      { url: 'https://example.test/negative', visitedAt: -1 },
      { url: 'https://example.test/no-time' },
      second,
      first
    ])
  )
  expect(entries).toEqual([first, second])
  expect(parseBrowserHistory('{')).toEqual([])
  expect(parseBrowserHistory('null')).toEqual([])
  expect(parseBrowserHistory('{"url":"https://example.test/"}')).toEqual([])
})

test('storage recovery caps a larger valid history and preserves its newest-first order', () => {
  const entries = Array.from({ length: 60 }, (_, index) => ({
    url: `https://example.test/${index}`,
    visitedAt: 60 - index
  }))
  const recovered = parseBrowserHistory(JSON.stringify(entries))
  expect(recovered.length).toBe(50)
  expect(recovered[0]).toEqual(entries[0])
  expect(recovered.at(-1)).toEqual(entries[49])
})

test('retains local HTML visits through persistence without accepting other local resources', () => {
  const url = 'file:///private/tmp/owned%20export.html'
  const entries = recordBrowserHistory([first], url, 20)
  expect(entries[0]).toEqual({ url, visitedAt: 20 })
  expect(parseBrowserHistory(JSON.stringify(entries))).toEqual([...entries])
  for (const unsafe of ['file:///etc/hosts', 'file:///tmp/image.png', 'file://remote/export.html'])
    expect(recordBrowserHistory(entries, unsafe, 21)).toBe(entries)
})
