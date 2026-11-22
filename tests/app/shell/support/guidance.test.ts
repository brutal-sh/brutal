import { describe, expect, test } from 'bun:test'

import type { SupportEnvironment } from '@/app/shell/support/detect'
import {
  SYSTEM_REQUIREMENTS_URL,
  WEBVIEW2_DOWNLOAD_URL,
  bootFailureNotice,
  unsupportedNotice
} from '@/app/shell/support/guidance'

const MISSING = ['String.prototype.isWellFormed']

function environment(overrides: Partial<SupportEnvironment>): SupportEnvironment {
  return {
    host: 'browser',
    os: 'unknown',
    browser: 'unknown',
    userAgent: 'test-agent',
    ...overrides
  }
}

function reportLink(notice: ReturnType<typeof unsupportedNotice>): URL {
  const link = notice.links.find((entry) => entry.label === 'Report a problem')
  expect(link).toBeDefined()
  return new URL(link?.url ?? '')
}

describe('unsupported engine guidance', () => {
  test('tells a desktop Mac on a supported macOS to install Software Update', () => {
    const notice = unsupportedNotice(
      environment({ host: 'desktop', os: 'macos', browser: 'safari', osVersion: '13.7.8' }),
      MISSING
    )
    expect(notice.heading).toBe('Update macOS to run Brutal')
    expect(notice.paragraphs[0]).toContain('macOS 13.7.8')
    expect(notice.paragraphs[1]).toContain('Software Update')
    expect(notice.details).toContain('Host: desktop app')
  })

  test('tells a desktop Mac below the minimum macOS to upgrade the OS', () => {
    const notice = unsupportedNotice(
      environment({ host: 'desktop', os: 'macos', browser: 'safari', osVersion: '12.6.4' }),
      MISSING
    )
    expect(notice.heading).toBe('Brutal needs macOS 13 or later')
  })

  test('names the WebKitGTK package on Linux desktops', () => {
    const notice = unsupportedNotice(
      environment({ host: 'desktop', os: 'linux', browser: 'safari', webviewVersion: '2.38.6' }),
      MISSING
    )
    expect(notice.heading).toBe('Update WebKitGTK to run Brutal')
    expect(notice.paragraphs[0]).toContain('2.38.6')
    expect(notice.paragraphs[1]).toContain('webkit2gtk-4.1')
  })

  test('links the WebView2 runtime on Windows desktops', () => {
    const notice = unsupportedNotice(
      environment({ host: 'desktop', os: 'windows', browser: 'edge', browserVersion: 100 }),
      MISSING
    )
    expect(notice.heading).toBe('Update WebView2 to run Brutal')
    expect(notice.links.map((link) => link.url)).toContain(WEBVIEW2_DOWNLOAD_URL)
  })

  test.each([
    [
      'chrome',
      105,
      'Update Chrome to run Brutal',
      'Chrome 105 detected. Brutal needs Chrome 111 or later.'
    ],
    [
      'edge',
      109,
      'Update Edge to run Brutal',
      'Edge 109 detected. Brutal needs Edge 111 or later.'
    ],
    [
      'firefox',
      115,
      'Update Firefox to run Brutal',
      'Firefox 115 detected. Brutal needs Firefox 128 or later.'
    ],
    [
      'safari',
      16.2,
      'Update Safari to run Brutal',
      'Safari 16.2 detected. Brutal needs Safari 16.4 or later.'
    ],
    [
      'opera',
      108,
      'Update Opera to run Brutal',
      'Opera 108 detected. Brutal needs Opera built on Chrome 111 or later.'
    ]
  ] as const)(
    'names the outdated %s version and the minimum',
    (browser, version, heading, first) => {
      const notice = unsupportedNotice(
        environment({ os: 'windows', browser, browserVersion: version }),
        MISSING
      )
      expect(notice.heading).toBe(heading)
      expect(notice.paragraphs[0]).toBe(first)
      expect(notice.paragraphs[1]).not.toHaveLength(0)
    }
  )

  test('sends every iOS browser to the system software update', () => {
    const notice = unsupportedNotice(
      environment({ os: 'ios', browser: 'safari', browserVersion: 16.1 }),
      MISSING
    )
    expect(notice.heading).toBe('Update iOS to run Brutal')
    expect(notice.paragraphs[0]).toContain('iOS 16.4')
  })

  test('does not ask a browser that already meets the baseline to update', () => {
    const notice = unsupportedNotice(
      environment({ os: 'windows', browser: 'chrome', browserVersion: 120 }),
      MISSING
    )
    expect(notice.heading).toBe('A required browser feature is unavailable')
    expect(notice.paragraphs[0]).toContain('Chrome 120')
    expect(notice.paragraphs[0]).toContain('String.prototype.isWellFormed')
  })

  test('falls back to the full requirements for an unknown browser', () => {
    const notice = unsupportedNotice(environment({}), MISSING)
    expect(notice.heading).toBe("Brutal can't run in this browser")
    expect(notice.paragraphs[0]).toBe(
      'Brutal needs Chrome 111, Edge 111, Firefox 128, or Safari 16.4 or later.'
    )
  })

  test('opens the public bug form and keeps diagnostic details in the notice', () => {
    const notice = unsupportedNotice(
      environment({ os: 'linux', browser: 'firefox', browserVersion: 115 }),
      MISSING
    )
    const url = reportLink(notice)
    expect(url.origin + url.pathname).toBe(
      'https://github.com/brutal-sh/open-pen-feedback/issues/new'
    )
    expect(url.searchParams.get('template')).toBe('bug.yml')
    expect([...url.searchParams.keys()].sort()).toEqual(['template', 'title', 'version'])
    expect(notice.details).toContain('Missing: String.prototype.isWellFormed')
    expect(notice.details).toContain('Browser: Firefox 115')
    expect(notice.links.map((link) => link.url)).toContain(SYSTEM_REQUIREMENTS_URL)
  })
})

describe('boot failure guidance', () => {
  test('explains a blank window and carries the error into the details', () => {
    const error = new TypeError('Promise.withResolvers is not a function')
    const notice = bootFailureNotice(
      environment({ host: 'desktop', os: 'macos', browser: 'safari', osVersion: '13.7.8' }),
      error
    )
    expect(notice.heading).toBe("Brutal couldn't start")
    expect(notice.paragraphs[1]).toContain('Safari updates')
    expect(notice.details[0]).toBe('TypeError: Promise.withResolvers is not a function')
    expect(notice.details).toContain('OS: macos 13.7.8')
    expect([...reportLink(notice).searchParams.keys()].sort()).toEqual([
      'template',
      'title',
      'version'
    ])
  })

  test('states the browser requirements for a web boot failure', () => {
    const notice = bootFailureNotice(environment({ os: 'windows', browser: 'chrome' }), 'boom')
    expect(notice.paragraphs[1]).toContain('Chrome 111')
    expect(notice.details[0]).toBe('boom')
  })
})
