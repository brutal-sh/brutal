import { test, expect } from '#tests/helpers/chat/fixture'
import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'

test.use({ locale: 'en-US' })

for (const labels of AI_SETUP_LABELS) {
  test(`network failure and Retry keep the selected language in ${labels.locale}`, async ({
    configuredChat: chat,
    page
  }, testInfo) => {
    const outbound: string[] = []
    await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
      outbound.push(route.request().url())
      await route.abort()
    })
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    await page.getByTestId('settings-section-general').click()
    await page.getByTestId('settings-language').click()
    await page.getByRole('option', { name: labels.languageName, exact: true }).click()
    await page.getByTestId('app-settings-done').click()
    const input = page.getByTestId('chat-input')
    await expect(input).toHaveAttribute('aria-label', labels.describeChange)
    const attempts = await page.evaluateHandle(() => {
      const setTransport = window.openPencil?.setChatTransport
      if (!setTransport) throw new Error('Chat transport override is unavailable')
      const state = { count: 0 }
      setTransport(() => ({
        async sendMessages() {
          if (++state.count === 1) throw new TypeError('Failed to fetch')
          return new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'start', messageId: 'network-retry-fixture' })
              controller.enqueue({ type: 'text-start', id: 'fixture-text' })
              controller.enqueue({
                type: 'text-delta',
                id: 'fixture-text',
                delta: 'Fixture retry completed'
              })
              controller.enqueue({ type: 'text-end', id: 'fixture-text' })
              controller.enqueue({ type: 'finish', finishReason: 'stop' })
              controller.close()
            }
          })
        },
        async reconnectToStream() {
          return null
        }
      }))
      return state
    })
    try {
      await input.fill('Exercise the local failure fixture')
      await input.press('Enter')
      const notice = page
        .locator('[data-slot="toast"]')
        .filter({ hasText: labels.chatNetworkFailed })
      await expect(notice).toBeVisible()
      await notice.screenshot({ path: testInfo.outputPath(`${labels.locale}-network.png`) })
      await notice.getByRole('button', { name: labels.retryRequest, exact: true }).click()
      await expect(chat.assistantMessage()).toContainText('Fixture retry completed')
      await expect(page.getByTestId('chat-message-user')).toHaveCount(1)
      expect(await attempts.evaluate((state) => state.count)).toBe(2)
      expect(outbound).toEqual([])
      await expect(notice).toHaveCount(0)
    } finally {
      await attempts.dispose()
    }
  })
}
