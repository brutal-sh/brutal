import { expect, test } from 'bun:test'

import { confirmBrowserSiteClear } from '@/app/browser-preview/clear'
import { nextBrowserZoom } from '@/app/browser-preview/zoom'

test('zoom steps choose the next level and stop at the responsive limits', () => {
  expect(nextBrowserZoom(0.5, 1)).toBe(0.75)
  expect(nextBrowserZoom(0.5, -1)).toBe(0.3)
  expect(nextBrowserZoom(0.6, 1)).toBe(0.75)
  expect(nextBrowserZoom(0.6, -1)).toBe(0.5)
  expect(nextBrowserZoom(1.5, 1)).toBe(1.5)
  expect(nextBrowserZoom(0.25, -1)).toBe(0.25)
})

test('site-data clearing requires the affirmative choice and identifies the origin', async () => {
  const confirmed = await confirmBrowserSiteClear(
    'https://example.test/private?secret=value',
    async (_message, options) => {
      expect(options?.title).toBe('Clear website data for https://example.test?')
      return 'Clear Data'
    }
  )
  expect(confirmed).toBe(true)
  expect(await confirmBrowserSiteClear('https://example.test/', async () => 'Cancel')).toBe(false)
})
