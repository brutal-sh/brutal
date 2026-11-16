import { test, type Page } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'

/** Own cold construction separately from the checked journey, with the existing phase limits. */
export function useRecoverySetup<T>(prepare: (page: Page) => Promise<T>) {
  let page: Page | undefined
  let state: T | undefined
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await mockEditorCopyServices(page)
    state = await prepare(page)
  })
  test.afterAll(async () => {
    if (page) await page.close()
  })
  return {
    get page() {
      if (!page) throw new Error('Recovery page was not prepared')
      return page
    },
    get state() {
      if (state === undefined) throw new Error('Recovery state was not prepared')
      return state
    }
  }
}
