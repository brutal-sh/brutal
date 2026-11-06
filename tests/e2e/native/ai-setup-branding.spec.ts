import { strict as assert } from 'node:assert'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'

const OUTPUT = join(process.cwd(), 'local-evidence', 'brand-copy-ai-2026-11-06')

async function chooseLocale(name: string): Promise<void> {
  await (await $('[data-test-id="settings-language"]')).click()
  await browser.keys('Space')
  await (await $('[role="listbox"]')).waitForDisplayed()
  // Fixture setup targets the option; Enter still traverses the native WebView's UI handler.
  await browser.execute((language) => {
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (element) => element.textContent?.trim() === language
    )
    if (!option) throw new Error(`Native locale option missing: ${language}`)
    option.focus()
  }, name)
  await browser.keys('Enter')
  await browser.waitUntil(
    async () => (await (await $('[data-test-id="settings-language"]')).getText()).includes(name),
    { timeoutMsg: `Native language did not change to ${name}` }
  )
}

async function closeOwnedDialogs(): Promise<void> {
  if (await (await $('[role="listbox"]')).isExisting()) await browser.keys('Escape')
  if (await (await $('[data-test-id="ai-setup-dialog"]')).isExisting()) await browser.keys('Escape')
  const settings = await $('[data-test-id="app-settings-dialog"]')
  if (await settings.isExisting()) {
    await (await $('[data-test-id="settings-section-general"]')).click()
    await browser.keys('Escape')
    await settings.waitForExist({ reverse: true })
  }
}

describe('native translated agent setup identity', () => {
  let initialLanguage: string | undefined
  before(async () => {
    await mkdir(OUTPUT, { recursive: true })
    await ensureNativeEditorReady()
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await (await $('[data-test-id="app-settings-dialog"]')).waitForDisplayed()
    await (await $('[data-test-id="settings-section-general"]')).click()
    initialLanguage = (await (await $('[data-test-id="settings-language"]')).getText()).trim()
    assert.ok(AI_SETUP_LABELS.some((labels) => labels.languageName === initialLanguage))
    await closeOwnedDialogs()
  })

  afterEach(closeOwnedDialogs)
  after(async () => {
    await closeOwnedDialogs()
    if (!initialLanguage) return
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await (await $('[data-test-id="app-settings-dialog"]')).waitForDisplayed()
    await (await $('[data-test-id="settings-section-general"]')).click()
    await chooseLocale(initialLanguage)
    await closeOwnedDialogs()
  })

  for (const labels of AI_SETUP_LABELS) {
    it(`shows Open Pen agent and MCP labels in ${labels.locale} without signing in or installing`, async () => {
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
      const settings = await $('[data-test-id="app-settings-dialog"]')
      await settings.waitForDisplayed()
      await (await $('[data-test-id="settings-section-general"]')).click()
      await chooseLocale(labels.languageName)
      await (await $('[data-test-id="settings-section-ai"]')).click()
      await (await $('[data-test-id="settings-run-ai-setup"]')).click()
      const setup = await $('[data-test-id="ai-setup-dialog"]')
      await setup.waitForDisplayed()
      await browser.waitUntil(
        async () => (await setup.getText()).includes(labels.aiSetupGoalsTitle),
        { timeoutMsg: `Native goals did not render in ${labels.locale}` }
      )
      await (await setup.$(`button=${labels.aiSetupContinue}`)).click()
      await browser.waitUntil(
        async () => (await setup.getText()).includes(labels.aiSetupAccessTitle),
        { timeoutMsg: `Native access did not render in ${labels.locale}` }
      )
      const codex = await setup.$('label*=Codex')
      await codex.waitForDisplayed()
      assert.equal((await setup.getText()).includes(labels.aiSetupAccessAgentsDesktop), false)
      await browser.saveScreenshot(join(OUTPUT, `${labels.locale}-native-access.png`))
      await codex.click()
      await (await setup.$(`button=${labels.aiSetupContinue}`)).click()
      const connection = await setup.$('[data-provider="acp:codex"]')
      await connection.waitForDisplayed()
      await browser.waitUntil(
        async () => (await connection.getText()).includes(labels.aiSetupAgentMCP),
        { timeoutMsg: `Native Open Pen MCP label did not render in ${labels.locale}` }
      )
      assert.equal((await connection.getText()).includes('OpenPencil'), false)
      await browser.saveScreenshot(join(OUTPUT, `${labels.locale}-native-codex.png`))
      await browser.keys('Escape')
      await setup.waitForExist({ reverse: true })
      await browser.keys('Escape')
      await settings.waitForExist({ reverse: true })
    })
  }
})
