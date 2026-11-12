import type { Page } from '@playwright/test'

import type * as BrowserFixture from './browser'

export function installToolTitle(page: Page) {
  return page.evaluateHandle(async () => {
    const fixturePath = '/tests/helpers/chat/tool-titles/browser.ts'
    const fixture: typeof BrowserFixture = await import(fixturePath)
    return fixture.installBrowserToolTitle()
  })
}
