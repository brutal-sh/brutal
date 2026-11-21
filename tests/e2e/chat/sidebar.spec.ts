import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

test('composer draft remains visible across workspace panel changes', async () => {
  const testInfo = test.info()
  const page = editor.page
  const input = page.getByRole('textbox', { name: 'Describe a change' })
  await page.getByRole('tab', { name: 'Chat', exact: true }).click()
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
  const history = page.getByRole('button', { name: 'Chat history', exact: true })
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
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add image or file' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'design-notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Use the original layout.')
  })
  const attachment = page.getByRole('button', { name: 'Remove attachment design-notes.txt' })
  const model = page.getByRole('combobox', { name: 'Select design model' })
  await expect(attachment).toBeVisible()
  await expect(model).toContainText('Unsent draft acceptance')
  await page.setViewportSize({ width: 960, height: 800 })
  const tabs = page.getByRole('tablist', { name: 'Workspace panels' })
  const rows = await tabs
    .getByRole('tab')
    .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top))
  expect(new Set(rows).size).toBe(1)
  const chat = tabs.getByRole('tab', { name: 'Chat', exact: true })
  const historyTab = tabs.getByRole('tab', { name: 'Chat history', exact: true })
  await chat.focus()
  await chat.press('ArrowLeft')
  await expect(historyTab).toBeFocused()
  await expect(historyTab).toHaveAttribute('aria-selected', 'true')
  const historyPanel = page.getByRole('tabpanel', { name: 'Chat history', exact: true })
  await expect(historyPanel.getByRole('button', { name: 'New chat' })).toBeVisible()
  await expect(historyPanel.getByRole('button', { name: 'This document' })).toBeVisible()
  await expect(historyPanel.getByText('No conversations found.')).toBeVisible()
  await expect(input).toContainText('Keep this unsent design note')
  await expect(attachment).toBeVisible()
  await expect(model).toContainText('Unsent draft acceptance')
  await page.screenshot({ path: testInfo.outputPath('chat-history-narrow.png') })

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
  await chat.click()
  await expect(input).toBeVisible()
  await expect(input).toContainText('Keep this unsent design note')
  await expect(attachment).toBeVisible()
  await expect(page.getByTestId('chat-message-user')).toHaveCount(0)
})
