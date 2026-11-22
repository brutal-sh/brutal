import type { Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { CATALOG_ONLY_MODEL, routeModelCatalog } from '#tests/helpers/chat/catalog'
import { expect, test } from '#tests/helpers/chat/fixture'
import { ChatHarness } from '#tests/helpers/chat/harness'

test('Design profile selector exposes provider and capabilities', async ({
  configuredChat: chat
}) => {
  await chat.profileTrigger.click()

  await expect(chat.page.getByText('Design agent', { exact: true })).toBeVisible()
  const group = chat.page.getByRole('group', { name: 'OpenRouter' })
  await expect(group.getByRole('option', { name: /Claude Sonnet/ })).toBeVisible()
  await expect(group.getByRole('img', { name: 'Image input' })).toBeVisible()
  await expect(chat.page.getByRole('button', { name: 'Manage models and roles…' })).toBeVisible()
})

test('OpenRouter accepts a custom model ID from Settings', async ({ configuredChat: chat }) => {
  const customModel = 'meta-llama/llama-3.3-70b-instruct'
  await chat.page.getByTestId('provider-settings-trigger').click()
  await chat.page.locator('[data-model-id]').first().click()
  await chat.page.getByLabel('Model ID').click()
  // The catalog replaces the fallback list once it loads; pick only after it has settled.
  await expect(chat.page.getByRole('option', { name: CATALOG_ONLY_MODEL })).toBeVisible()
  await chat.page.getByRole('option', { name: 'Custom model…' }).click()
  const input = chat.page.getByTestId('provider-settings-custom-model')
  await input.fill(customModel)
  await chat.page.getByRole('button', { name: 'Save model' }).click()
  await chat.page.getByTestId('app-settings-done').click()

  await expect(chat.profileTrigger).toContainText('Claude Sonnet')
})

test('Get API key links to the provider key page', async ({ configuredChat: chat }) => {
  await chat.page.getByTestId('provider-settings-trigger').click()
  await chat.page.locator('[data-model-id]').first().click()

  await expect(chat.page.getByRole('link', { name: 'Get API key' })).toHaveAttribute(
    'href',
    'https://openrouter.ai/keys'
  )
})

/** OpenRouter refusing every key but `validKey`, and answering that one with a streamed reply. */
async function routeOpenRouterKey(page: Page, validKey: string): Promise<string[]> {
  const keys: string[] = []
  await page.route('https://openrouter.ai/api/v1/chat/completions', (route) => {
    const key = route.request().headers().authorization?.replace('Bearer ', '') ?? ''
    keys.push(key)
    if (key !== validKey) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'User not found.', code: 401 } })
      })
    }
    return route.fulfill({
      contentType: 'text/event-stream',
      body: streamedReply('Hello again')
    })
  })
  return keys
}

function streamedReply(content: string): string {
  const chunk = (delta: object, finish: string | null) =>
    `data: ${JSON.stringify({
      id: 'provider-test',
      object: 'chat.completion.chunk',
      created: 0,
      model: 'test/model',
      choices: [{ index: 0, delta, finish_reason: finish }]
    })}\n\n`
  return chunk({ role: 'assistant', content }, null) + chunk({}, 'stop') + 'data: [DONE]\n\n'
}

test('searching and switching providers in Chat keeps a direct conversation', async ({ page }) => {
  const apiKey = 'sk-or-test-key'
  const baseURL = 'https://provider.test/v1'
  const requests: string[] = []
  await routeModelCatalog(page)
  await routeOpenRouterKey(page, apiKey)
  await page.route(`${baseURL}/chat/completions`, (route) => {
    requests.push(route.request().postData() ?? '')
    return route.fulfill({
      contentType: 'text/event-stream',
      body: streamedReply('Second provider replied')
    })
  })

  const chat = new ChatHarness(page)
  await chat.open()
  await new CanvasHelper(page).waitForInit()
  await chat.configureOpenRouter(apiKey)
  await chat.submit('Remember this first prompt')
  await expect(chat.assistantMessage()).toContainText('Hello again')

  await chat.profileTrigger.click()
  await page.getByRole('button', { name: 'Manage models and roles…' }).click()
  await page.getByTestId('settings-add-model').click()
  const editor = page.getByTestId('settings-model-editor')
  await editor.locator('[data-provider="openai-compatible"]').click()
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Studio model')
  await editor.getByRole('textbox', { name: 'Base URL', exact: true }).fill(baseURL)
  await editor.getByRole('button', { name: 'Model ID', exact: true }).click()
  await page.getByRole('option', { name: 'Custom model…' }).click()
  await page.getByTestId('provider-settings-custom-model').fill('studio-design-v1')
  await chat.apiKeyInput.fill('studio-key')
  await editor.getByRole('button', { name: 'Save model' }).click()
  await page.getByTestId('app-settings-done').click()

  await chat.profileTrigger.press('Enter')
  const search = page.getByRole('textbox', { name: 'Search models…' })
  await expect(search).toBeFocused()
  await search.fill('OpenAI-compatible')
  await expect(page.getByRole('option', { name: /Claude Sonnet/ })).toHaveCount(0)
  await expect(page.getByRole('option', { name: /Studio model/ })).toBeVisible()
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(chat.profileTrigger).toContainText('Studio model')
  await expect(chat.profileTrigger).toBeFocused()

  await chat.submit('Continue the same conversation')
  await expect(chat.assistantMessage()).toContainText('Second provider replied')
  await expect(page.getByTestId('chat-message-user')).toHaveCount(2)
  expect(requests).toHaveLength(1)
  expect(requests[0]).toContain('studio-design-v1')
  expect(requests[0]).toContain('Remember this first prompt')
  expect(requests[0]).toContain('Continue the same conversation')
})

test('a key replaced in Settings is used when asking again', async ({ page }) => {
  await routeModelCatalog(page)
  const keys = await routeOpenRouterKey(page, 'sk-or-valid')
  const chat = new ChatHarness(page)
  await chat.open()
  await new CanvasHelper(page).waitForInit()
  await chat.configureOpenRouter('sk-or-expired')

  await chat.submit('Say hello')
  const toast = page.locator('[data-slot="toast"]')
  await toast.getByRole('button', { name: 'Open settings' }).click()
  await page.locator('[data-model-id]').first().click()
  await chat.apiKeyInput.fill('sk-or-valid')
  await page.getByRole('button', { name: 'Save model' }).click()
  await page.getByTestId('app-settings-done').click()

  await chat.assistantMessage().getByTestId('chat-regenerate').click()
  await expect(chat.assistantMessage()).toContainText('Hello again')
  expect(keys).toEqual(['sk-or-expired', 'sk-or-valid'])
  // The failure's notice goes once the request is asked again.
  await expect(toast).toHaveCount(0)
})
