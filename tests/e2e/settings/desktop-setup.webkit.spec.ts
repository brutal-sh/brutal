import { expect, test, type Locator } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'
import { getSelectedNode } from '#tests/helpers/store'

const SETUP_URL = 'https://open-pen.vercel.app/help/getting-started/'

for (const surface of ['guided setup', 'provider chooser', 'MCP settings'] as const) {
  test(`${surface} offers desktop setup only when needed and preserves the design`, async ({
    page,
    context
  }, testInfo) => {
    const interceptedURLs = await mockEditorCopyServices(page)
    const destinations: string[] = []
    await context.route(SETUP_URL, async (route) => {
      destinations.push(route.request().url())
      await route.fulfill({
        contentType: 'text/html',
        body: '<title>Brutal desktop setup</title>'
      })
    })
    await page.goto('/?test')
    const developmentHost = (await page.locator('script[src^="/@vite/client"]').count()) > 0
    const canvas = new CanvasHelper(page)
    await canvas.waitForInit()
    await canvas.drawRect(350, 300, 160, 100)
    const before = await getSelectedNode(page)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    let panel: Locator
    if (surface === 'MCP settings') {
      await page.getByTestId('settings-section-mcp').click()
      panel = page.getByTestId('settings-mcp-automation-panel')
    } else {
      await page.getByTestId('settings-section-ai').click()
      if (surface === 'guided setup') {
        await page.getByTestId('settings-run-ai-setup').click()
        panel = page.getByTestId('ai-setup-dialog')
        await panel.getByRole('button', { name: 'Continue', exact: true }).click()
      } else {
        await page.getByTestId('settings-add-model').click()
        panel = page.getByTestId('settings-model-provider-chooser')
      }
    }
    const link = panel.getByRole('link', { name: 'Desktop setup', exact: true })
    if (surface === 'MCP settings' && developmentHost) {
      await expect(panel.getByTestId('settings-mcp-restart')).toBeVisible()
      await expect(link).toHaveCount(0)
      expect(await getSelectedNode(page)).toEqual(before)
      expect(destinations).toEqual([])
      expect(interceptedURLs).toEqual([])
      canvas.assertNoErrors()
      return
    }
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', SETUP_URL)
    await panel.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath('desktop-setup.png')
    })
    const opening = page.waitForEvent('popup')
    await link.focus()
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    const setup = await opening
    try {
      await expect(setup).toHaveURL(SETUP_URL)
    } finally {
      await setup.close()
    }
    await expect(panel).toBeVisible()
    expect(await getSelectedNode(page)).toEqual(before)
    expect(destinations).toEqual([SETUP_URL])
    expect(interceptedURLs).toEqual([])
    canvas.assertNoErrors()
  })
}
