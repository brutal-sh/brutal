import { strict as assert } from 'node:assert'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'
import { chooseLocale, closeOwnedDialogs } from '#tests/helpers/tauri/settings'

const OUTPUT = join(process.cwd(), 'local-evidence', 'brand-copy-ai-2026-11-06')

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
      const guide = await connection.$('a[href]')
      const guideURL = await guide.getAttribute('href')
      assert.ok(guideURL)
      // Tauri's shell plugin also opens bubbling clicks on blank-target anchors.
      assert.notEqual(await guide.getAttribute('target'), '_blank')
      await invokeNative('take_native_test_opened_urls')
      await guide.click()
      await browser.waitUntil(
        async () => {
          const urls = await invokeNative<string[]>('take_native_test_opened_urls')
          if (urls.length === 0) return false
          assert.deepEqual(urls, [guideURL])
          return true
        },
        { timeoutMsg: 'The native setup guide did not reach the app’s browser opener' }
      )
      await browser.saveScreenshot(join(OUTPUT, `${labels.locale}-native-codex.png`))
      await browser.keys('Escape')
      await setup.waitForExist({ reverse: true })
      await browser.keys('Escape')
      await settings.waitForExist({ reverse: true })
    })
  }
})
