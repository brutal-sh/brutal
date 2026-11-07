import type { Page } from '@playwright/test'

import { cloudDiscoveryFixture } from '#tests/helpers/cloud/discovery'
import { mockFontsource } from '#tests/helpers/fonts/fontsource'
import { mockGoogleFonts } from '#tests/helpers/fonts/google'

/** Keep editor-copy acceptance local and report any unconfigured remote request. */
export async function mockEditorCopyServices(page: Page) {
  const interceptedURLs: string[] = []
  await page.route('https://**/*', async (route) => {
    interceptedURLs.push(route.request().url())
    await route.abort()
  })
  await mockGoogleFonts(page, [])
  await mockFontsource(page, [])
  await page.route('https://cloud.openpencil.dev/.well-known/openpencil', (route) =>
    route.fulfill({ json: cloudDiscoveryFixture('https://cloud.openpencil.dev') })
  )
  return interceptedURLs
}
