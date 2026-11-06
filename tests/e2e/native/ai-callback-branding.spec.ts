import { strict as assert } from 'node:assert'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as v from 'valibot'

import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'
import { chooseLocale, closeOwnedDialogs } from '#tests/helpers/tauri/settings'

const OUTPUT = join(process.cwd(), 'local-evidence', 'brand-copy-ai-2026-11-06', 'callback')

describe('native translated ChatGPT callback cancellation', () => {
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
    it(`shows stale and cancelled callback copy in ${labels.locale} without provider sign-in`, async () => {
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
      await (await $('[data-test-id="app-settings-dialog"]')).waitForDisplayed()
      await (await $('[data-test-id="settings-section-general"]')).click()
      await chooseLocale(labels.languageName)
      await (await $('[data-test-id="settings-section-ai"]')).click()
      await (await $('[data-test-id="settings-run-ai-setup"]')).click()
      const setup = await $('[data-test-id="ai-setup-dialog"]')
      await setup.waitForDisplayed()
      await browser.waitUntil(async () =>
        (await setup.getText()).includes(labels.aiSetupGoalsTitle)
      )
      await (await setup.$(`button=${labels.aiSetupContinue}`)).click()
      const subscription = await setup.$(
        './/label[@data-slot="checkbox-card"][.//span[text()="ChatGPT"]]'
      )
      await subscription.waitForDisplayed()
      const checkbox = await subscription.$('[role="checkbox"]')
      if ((await checkbox.getAttribute('data-state')) !== 'checked') await subscription.click()
      assert.equal(await checkbox.getAttribute('data-state'), 'checked')
      await (await setup.$(`button=${labels.aiSetupContinue}`)).click()
      const connection = await setup.$('[data-provider="chatgpt"]')
      await connection.waitForDisplayed()
      // The native-test opener records this URL instead of opening a browser or provider.
      await invokeNative('take_native_test_opened_urls')
      await (await connection.$(`button=${labels.aiSetupChatGPTSignIn}`)).click()
      let opened: string[] = []
      await browser.waitUntil(async () => {
        opened = v.parse(v.array(v.string()), await invokeNative('take_native_test_opened_urls'))
        return opened.length > 0
      })
      assert.equal(opened.length, 1)
      const authorization = new URL(opened[0] ?? '')
      assert.equal(authorization.origin, 'https://auth.openai.com')
      const callback = new URL(authorization.searchParams.get('redirect_uri') ?? '')
      assert.equal(callback.origin, 'http://localhost:1455')
      assert.equal(callback.pathname, '/auth/callback')
      const state = authorization.searchParams.get('state')
      assert.ok(state)
      callback.searchParams.set('state', `${state}-stale`)
      callback.searchParams.set('error', 'access_denied')
      const stale = await fetch(callback, { redirect: 'error' })
      assert.equal(stale.status, 400)
      const staleHTML = await stale.text()
      assert.ok(staleHTML.includes(labels.aiSetupChatGPTCallbackStale))
      assert.equal(staleHTML.includes('OpenPencil'), false)
      assert.ok((await connection.getText()).includes(labels.aiSetupChatGPTWaiting))
      callback.searchParams.set('state', state)
      const cancelled = await fetch(callback, { redirect: 'error' })
      assert.equal(cancelled.status, 200)
      const cancelledHTML = await cancelled.text()
      assert.ok(cancelledHTML.includes(labels.aiSetupChatGPTCallbackCancelled))
      await browser.waitUntil(async () =>
        (await connection.getText()).includes(labels.aiSetupSignInCancelled)
      )
      await (await connection.$(`button=${labels.aiSetupChatGPTSignIn}`)).waitForEnabled()
      await writeFile(join(OUTPUT, `${labels.locale}-stale.html`), staleHTML)
      await writeFile(join(OUTPUT, `${labels.locale}-cancelled.html`), cancelledHTML)
      await browser.saveScreenshot(join(OUTPUT, `${labels.locale}-cancelled.png`))
    })
  }
})
