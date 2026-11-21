import { expect, type Page } from '@playwright/test'

export class ChatHarness {
  constructor(readonly page: Page) {}

  get input() {
    return this.page.getByRole('textbox', { name: 'Describe a change' })
  }

  get chatTab() {
    return this.page.getByRole('tab', { name: 'Chat', exact: true })
  }

  get apiKeyInput() {
    return this.page.getByTestId('provider-settings-api-key')
  }

  get sendButton() {
    return this.page.getByTestId('chat-send-button')
  }

  get profileTrigger() {
    return this.page
      .getByTestId('chat-panel')
      .getByRole('combobox', { name: 'Select design model', exact: true })
  }

  userMessage() {
    return this.page.getByTestId('chat-message-user').last()
  }

  assistantMessage() {
    return this.page.getByTestId('chat-message-assistant').last()
  }

  async open(): Promise<void> {
    await this.page.goto('/')
    await this.page.locator('html[data-theme]').waitFor()
    if ((await this.page.locator('html').getAttribute('data-theme')) === 'light') {
      await this.page.getByRole('button', { name: 'Main menu', exact: true }).click()
      await this.page.getByRole('menuitem', { name: 'Toggle Light/Dark mode', exact: true }).click()
    }
    await this.page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
  }

  async configureOpenRouter(apiKey: string): Promise<void> {
    await this.chatTab.click()
    await this.page.getByTestId('provider-setup-open-settings').click()
    await this.page.locator('[data-model-id]').first().click()
    const provider = this.page.getByTestId('settings-model-provider')
    await provider.click()
    await this.page.getByRole('option', { name: 'OpenRouter', exact: true }).press('Enter')
    await expect(provider).toContainText('OpenRouter')
    await this.page.getByLabel('Name').fill('Claude Sonnet')
    await this.apiKeyInput.fill(apiKey)
    await this.page.getByRole('button', { name: 'Save model' }).click()
    await this.page.getByTestId('app-settings-done').click()
    await this.input.waitFor()
  }

  async submit(text: string): Promise<void> {
    await this.input.fill(text)
    await this.input.press('Enter')
  }
}
