import { expect, test } from '@playwright/test'

import { storyOutcome } from '#tests/helpers/storybook/outcome'

test.use({ testIdAttribute: 'data-test-id' })

for (const theme of ['dark', 'light']) {
  test(`legacy asset grid/list metadata and default insertion in ${theme}`, async ({
    page
  }, info) => {
    await page.goto(
      `/iframe.html?id=app-assets-panel--legacy&viewMode=story&globals=theme:${theme}`
    )
    expect(await storyOutcome(page)).toBe('ok')
    const panel = page.getByTestId('assets-panel')
    const button = panel.getByTestId('asset-item').filter({ hasText: 'Button' })
    await expect(panel.getByTestId('asset-item')).toHaveCount(2)
    await expect(button.locator('[data-slot="asset-thumbnail"]')).toHaveClass(/size-24/)
    await panel.screenshot({ path: info.outputPath('legacy-grid.png'), animations: 'disabled' })
    await panel.getByRole('button', { name: 'List view' }).click()
    await expect(button.locator('[data-slot="asset-thumbnail"]')).toHaveClass(/size-10/)
    await expect(button.getByTestId('asset-variant-summary')).toContainText('3 variants · Type')
    await expect(button.getByTestId('asset-description')).toHaveText('Reusable button component')
    await expect(button.getByTestId('asset-library-badge')).toHaveText('Library')
    await expect(button.getByTestId('asset-variant-conflict')).toHaveText(
      'Duplicate variant values'
    )
    await expect(button.getByTestId('asset-docs')).toBeVisible()
    await panel.screenshot({ path: info.outputPath('legacy-list.png'), animations: 'disabled' })
    await button.getByTestId('asset-insert').click()
    await expect(page.getByLabel('Inserted component', { exact: true })).toHaveText('Type=Primary')
  })
}
