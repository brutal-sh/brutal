import { strict as assert } from 'node:assert'
import { mkdir, readFile, realpath } from 'node:fs/promises'
import { join } from 'node:path'

import * as v from 'valibot'

import { AI_SETUP_LABELS } from '#tests/helpers/settings/ai-setup'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'
import { chooseLocale, closeOwnedDialogs } from '#tests/helpers/tauri/settings'

const enabled =
  process.env.OPENPENCIL_NATIVE_COMPANION_VERSIONS === '1' && process.platform !== 'win32'
const describeVersions = enabled ? describe : describe.skip
const OUTPUT = join(process.cwd(), 'local-evidence', 'brand-copy-ai-2026-11-06', 'versions')
const MODELS = [
  { provider: 'acp:codex', name: 'MCP version fixture', failure: 'chatMCPOutdated' },
  { provider: 'harness:pi', name: 'Harness version fixture', failure: 'chatPiCompanionOutdated' }
] as const

async function addModel(provider: string, name: string): Promise<void> {
  await (await $('[data-test-id="settings-add-model"]')).click()
  await (await $(`[data-provider="${provider}"]`)).click()
  const form = await $('[data-test-id="settings-model-editor"]')
  await form.waitForDisplayed()
  await (await form.$('input')).setValue(name)
  await (await form.$('button[type="submit"]')).click()
  await form.waitForExist({ reverse: true })
}

async function assignModel(name: string): Promise<void> {
  const assignment = await $('[data-test-id="settings-model-assignment-design"]')
  await assignment.click()
  if ((await assignment.getAttribute('aria-expanded')) !== 'true') await browser.keys('ArrowDown')
  await (await $('[role="listbox"]')).waitForDisplayed()
  // Fixture setup focuses a real option; Enter still runs the native WebView's UI handler.
  await browser.execute((name) => {
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (element) => element.textContent?.trim() === name
    )
    if (!option) throw new Error(`Native model option missing: ${name}`)
    option.focus()
  }, name)
  await browser.keys('Enter')
  await browser.waitUntil(async () => (await assignment.getText()).trim() === name)
}

describeVersions('native translated companion version failures', () => {
  let initialLanguage: string | undefined
  let fixtureDirectory: string | undefined

  before(async () => {
    // This command does not exist in production; fail before any model or chat interaction.
    await invokeNative('native_test_mcp_configuration')
    const root = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
    assert.ok(root)
    fixtureDirectory = join(await realpath(root), 'version-bin')
    const lookup = v.parse(
      v.object({
        executables: v.record(v.string(), v.nullable(v.string())),
        versions: v.record(v.string(), v.nullable(v.string()))
      }),
      await invokeNative('agent_lookup')
    )
    for (const executable of ['openpen-mcp-http', 'openpencil-harness', 'codex-acp']) {
      assert.equal(lookup.executables[executable], join(fixtureDirectory, executable))
    }
    assert.equal(lookup.versions['@open-pencil/mcp'], '0.0.0')
    assert.equal(lookup.versions['@open-pencil/harness'], '0.0.0')
    await mkdir(OUTPUT, { recursive: true })
    await ensureNativeEditorReady()
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await (await $('[data-test-id="settings-section-general"]')).click()
    initialLanguage = (await (await $('[data-test-id="settings-language"]')).getText()).trim()
    await chooseLocale('English')
    await (await $('[data-test-id="settings-section-ai"]')).click()
    for (const model of MODELS) await addModel(model.provider, model.name)
    await closeOwnedDialogs()
  })

  afterEach(closeOwnedDialogs)
  after(async () => {
    await closeOwnedDialogs()
    if (initialLanguage) {
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
      await (await $('[data-test-id="settings-section-general"]')).click()
      await chooseLocale(initialLanguage)
      await closeOwnedDialogs()
    }
    assert.ok(fixtureDirectory)
    // Setup may probe the rejecting ACP stub; Harness must receive only version probes.
    for (const executable of ['codex-acp', 'openpencil-harness']) {
      let calls = ''
      try {
        calls = await readFile(join(fixtureDirectory, `${executable}.calls`), 'utf8')
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      }
      if (executable === 'codex-acp') assert.match(calls, /^\n*$/)
      else
        assert.ok(
          calls
            .trim()
            .split('\n')
            .every((line) => line === '--version --help')
        )
    }
  })

  for (const labels of AI_SETUP_LABELS) {
    for (const model of MODELS) {
      it(`keeps ${model.provider} version failure, draft and setup action translated in ${labels.locale}`, async () => {
        await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
        await (await $('[data-test-id="settings-section-general"]')).click()
        await chooseLocale(labels.languageName)
        await (await $('[data-test-id="settings-section-ai"]')).click()
        await assignModel(model.name)
        await closeOwnedDialogs()
        const input = await $('[data-test-id="chat-input"]')
        const prompt = `Version guard ${labels.locale} ${model.provider}`
        await input.click()
        await input.addValue(prompt)
        await browser.waitUntil(async () => (await input.getText()).trim() === prompt)
        await (await $('[data-test-id="chat-send-button"]')).click()
        const toast = await $('[data-slot="toast"]')
        await toast.waitForDisplayed()
        assert.ok((await toast.getText()).includes(labels[model.failure]))
        assert.equal(await $$('[data-test-id="chat-message-user"]').length, 0)
        await browser.waitUntil(async () => (await input.getText()).trim() === prompt)
        await browser.waitUntil(() =>
          browser.execute(() => {
            const notice = document.querySelector('[data-slot="toast"]')
            return (
              notice !== null &&
              getComputedStyle(notice).opacity === '1' &&
              notice.getAnimations().every((animation) => animation.playState !== 'running')
            )
          })
        )
        await browser.saveScreenshot(join(OUTPUT, `${labels.locale}-${model.failure}.png`))
        await (await toast.$(`button=${labels.aiSetupRun}`)).click()
        const setup = await $('[data-test-id="ai-setup-dialog"]')
        await setup.waitForDisplayed()
        assert.ok((await setup.getText()).includes(labels.aiSetupGoalsTitle))
        await closeOwnedDialogs()
        if (await toast.isExisting()) await (await toast.$('[data-slot="toast-close"]')).click()
        await input.click()
        await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'a'])
        await browser.keys('Backspace')
        await browser.waitUntil(
          async () => (await input.getText()).trim() === labels.describeChange
        )
      })
    }
  }
})
