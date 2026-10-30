import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

test('composer draft remains visible across workspace panel changes', async () => {
  const testInfo = test.info()
  const page = editor.page
  const input = page.getByRole('textbox', { name: 'Describe a change' })
  await page.getByRole('tab', { name: 'Agent', exact: true }).click()
  if (!(await input.isVisible())) {
    await page.getByTestId('provider-setup-open-settings').click()
    await page.locator('[data-model-id]').first().click()
    await page.getByTestId('settings-model-provider').click()
    await page.getByRole('option', { name: 'OpenRouter', exact: true }).click()
    await page.getByLabel('Name', { exact: true }).fill('Unsent draft acceptance')
    await page.getByTestId('provider-settings-api-key').fill('sk-or-unsent-ui-fixture')
    await page.getByRole('button', { name: 'Save model', exact: true }).click()
    await page.getByTestId('app-settings-done').click()
  }
  // Configure through Settings, but never send a prompt or use a model transport.
  await expect(input).toBeVisible()
  const history = page.getByRole('button', { name: 'Conversation history', exact: true })
  await expect(history).toHaveCSS('height', '32px')
  await expect(history).toHaveCSS('border-radius', '6px')
  await expect(history).toHaveCSS('font-size', '13px')
  const headerSpacing = await history.evaluate((element) => {
    const header = element.parentElement
    if (!header) throw new Error('Conversation header is missing')
    const styles = getComputedStyle(header)
    return [styles.paddingTop, styles.paddingBottom, styles.paddingLeft, styles.gap]
  })
  expect(headerSpacing).toEqual(['10px', '14px', '12px', '8px'])
  await page.screenshot({ path: testInfo.outputPath('agent-header.png') })
  await input.fill('Keep this unsent design note')
  const tabs = page.getByRole('tablist', { name: 'Workspace panels' })
  await tabs.getByRole('tab', { name: 'Layers', exact: true }).click()
  await expect(input).toBeVisible()
  await expect(input).toContainText('Keep this unsent design note')
  await expect(page.getByTestId('layers-tree')).toBeVisible()
  await expect(page.getByTestId('layers-header')).toHaveCount(0)
  await expect(page.getByTestId('pages-panel')).toHaveCount(0)
  await expect(tabs).toHaveCount(1)
  const tabIds = await tabs.getByRole('tab').evaluateAll((items) => items.map((item) => item.id))
  expect(new Set(tabIds).size).toBe(tabIds.length)
  await page.screenshot({ path: testInfo.outputPath('layers-composer.png') })
  await tabs.getByRole('tab', { name: 'Slides', exact: true }).click()
  await expect(input).toBeVisible()
  await expect(input).toContainText('Keep this unsent design note')
  await tabs.getByRole('tab', { name: 'Agent', exact: true }).click()
  await expect(input).toBeVisible()
  await expect(input).toContainText('Keep this unsent design note')
  await expect(page.getByTestId('chat-message-user')).toHaveCount(0)
})
