import { test, expect, type Locator, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'

export function useEditorSetup(url = '/', setup?: (page: Page) => Promise<unknown>) {
  let page: Page
  let canvas: CanvasHelper

  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await mockOfficialCloudDiscovery(page)
    await setup?.(page)
    await page.goto(url)
    canvas = new CanvasHelper(page)
    await canvas.waitForInit()
  })

  test.afterAll(async () => {
    if (page) await page.close()
  })

  return {
    get page() {
      return page
    },
    get canvas() {
      return canvas
    }
  }
}

export function useEditorSetupWithClear(url = '/', setup?: (page: Page) => Promise<unknown>) {
  const ctx = useEditorSetup(url, setup)

  test.beforeEach(async () => {
    await ctx.canvas.clearCanvas()
  })

  return ctx
}

/** Automation cases own their tabs, workers and storage; none carry into the next case. */
export function useIsolatedEditorSetupWithClear(
  url = '/',
  setup?: (page: Page) => Promise<unknown>
) {
  let page: Page
  let canvas: CanvasHelper
  test.beforeEach(async ({ page: ownedPage }) => {
    page = ownedPage
    await mockOfficialCloudDiscovery(page)
    await setup?.(page)
    canvas = new CanvasHelper(page)
    await page.goto(url)
    await canvas.waitForInit()
    await canvas.clearCanvas()
  })
  return {
    get page() {
      return page
    },
    get canvas() {
      return canvas
    }
  }
}

export async function expectInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Expected visible element to have a bounding box')

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Expected page to have a viewport')

  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

export { test, expect }
