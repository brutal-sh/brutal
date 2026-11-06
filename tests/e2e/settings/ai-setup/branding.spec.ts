import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'

for (const labels of AI_SETUP_LABELS) {
  test.describe(labels.locale, () => {
    test.use({
      storageState: async ({ baseURL }, use) => {
        if (!baseURL) throw new Error('Browser test baseURL is required')
        await use({
          cookies: [],
          origins: [
            {
              origin: new URL(baseURL).origin,
              localStorage: [{ name: 'open-pencil-locale', value: labels.locale }]
            }
          ]
        })
      }
    })

    test('translated guided setup names Open Pen and discards an unsaved connection', async ({
      page
    }, testInfo) => {
      const requests: string[] = []
      await page.route('http://ai-setup.test/**', async (route) => {
        requests.push(route.request().url())
        await route.abort()
      })
      await page.goto('/?test')
      await new CanvasHelper(page).waitForInit()
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
      await page.getByTestId('settings-section-ai').click()
      await page.getByTestId('settings-run-ai-setup').click()
      const setup = page.getByTestId('ai-setup-dialog')
      await expect(
        setup.getByRole('heading', { name: labels.aiSetupGoalsTitle, exact: true })
      ).toBeVisible()
      const next = setup.getByRole('button', { name: labels.aiSetupContinue, exact: true })
      await next.click()
      await expect(
        setup.getByRole('heading', { name: labels.aiSetupAccessTitle, exact: true })
      ).toBeVisible()
      await expect(
        setup.getByText(labels.aiSetupAccessAgentsDesktop, { exact: true })
      ).toBeVisible()
      await expect(setup).not.toContainText('OpenPencil')
      await setup.screenshot({ path: testInfo.outputPath('access.png') })
      await setup.getByRole('checkbox', { name: labels.aiSetupAccessServer, exact: true }).click()
      await next.click()
      await expect(
        setup.getByRole('heading', { name: labels.aiSetupConnectTitle, exact: true })
      ).toBeVisible()
      await expect(next).toBeDisabled()
      await setup
        .getByRole('textbox', { name: labels.baseURL, exact: true })
        .fill('http://ai-setup.test/v1')
      await setup
        .getByRole('textbox', { name: labels.modelID, exact: true })
        .fill('copy-parity-fixture')
      await setup.getByLabel(labels.apiKey, { exact: true }).fill('copy-fixture-key')
      await expect(next).toBeDisabled()
      await expect(setup).not.toContainText('OpenPencil')
      await setup.screenshot({ path: testInfo.outputPath('connection.png') })
      await page.keyboard.press('Escape')
      await expect(setup).toHaveCount(0)
      await page.getByTestId('settings-run-ai-setup').click()
      await expect(
        setup.getByRole('heading', { name: labels.aiSetupGoalsTitle, exact: true })
      ).toBeVisible()
      await next.click()
      await expect(
        setup.getByRole('checkbox', { name: labels.aiSetupAccessServer, exact: true })
      ).not.toBeChecked()
      await setup.getByRole('checkbox', { name: labels.aiSetupAccessServer, exact: true }).click()
      await next.click()
      await expect(setup.getByRole('textbox', { name: labels.baseURL, exact: true })).toHaveValue(
        ''
      )
      await expect(setup.getByRole('textbox', { name: labels.modelID, exact: true })).toHaveValue(
        ''
      )
      await expect(setup.getByLabel(labels.apiKey, { exact: true })).toHaveValue('')
      await expect(next).toBeDisabled()
      expect(requests).toEqual([])
      await page.keyboard.press('Escape')
    })
  })
}
