import { expect, test } from 'bun:test'

import {
  browserViewportPreferences,
  readBrowserViewportPreferences,
  saveBrowserViewport
} from '@/app/browser-preview/preferences'

test('damaged or incomplete saved viewport choices retain usable defaults', () => {
  for (const text of ['{', 'null', '[]', '"phone"', '{}']) {
    expect(readBrowserViewportPreferences(text)).toEqual({
      preset: 'desktop',
      zoom: 0.5,
      responsiveZoom: 0.5
    })
  }
  expect(readBrowserViewportPreferences('{"preset":"phone"}')).toEqual({
    preset: 'phone',
    zoom: 0.5,
    responsiveZoom: 0.5
  })
  expect(
    readBrowserViewportPreferences('{"preset":"unknown","zoom":"bad","responsiveZoom":null}')
  ).toEqual({
    preset: 'desktop',
    zoom: 0.5,
    responsiveZoom: 0.5
  })
})

test('stored choices stay within the responsive and fixed viewport limits', () => {
  expect(
    readBrowserViewportPreferences('{"preset":"desktop","zoom":0,"responsiveZoom":9}')
  ).toEqual({
    preset: 'desktop',
    zoom: 0.25,
    responsiveZoom: 1.5
  })
  expect(readBrowserViewportPreferences('{"preset":"tablet","zoom":0,"responsiveZoom":0}')).toEqual(
    {
      preset: 'tablet',
      zoom: 0.1,
      responsiveZoom: 0.25
    }
  )
})

test('saving a fixed viewport retains the last responsive zoom for returning to Desktop', () => {
  const previous = { ...browserViewportPreferences.value }
  try {
    saveBrowserViewport('desktop', 0.75)
    expect(saveBrowserViewport('phone', 0.5)).toEqual({
      preset: 'phone',
      zoom: 0.5,
      responsiveZoom: 0.75
    })
    expect(saveBrowserViewport('tablet', 0.3)).toEqual({
      preset: 'tablet',
      zoom: 0.3,
      responsiveZoom: 0.75
    })
    expect(saveBrowserViewport('desktop', 1)).toEqual({
      preset: 'desktop',
      zoom: 1,
      responsiveZoom: 1
    })
  } finally {
    browserViewportPreferences.value = previous
  }
})
