import { strict as assert } from 'node:assert'
import { realpath, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

// Explicitly opt in: this sends real prompts through the already signed-in Codex CLI.
// Run this spec alone in the disposable native-test app with --mochaOpts.timeout 330000.
// Use the existing login and runtime.
const live = process.env.OPENPENCIL_LIVE_CODEX_ACP === '1'
const describeLive = live ? describe : describe.skip
const rectangleName = 'ACP acceptance rectangle'
const modelName = 'Native Codex acceptance'
const historyTrigger = 'button[aria-label="Chat history"]:not([role="tab"])'
const chatTab = '[role="tab"][aria-label="Chat"]'
const historyTab = '[role="tab"][aria-label="Chat history"]'
const activeTab = '[data-test-id="tabbar-tab"][aria-selected="true"]'
const assistant = '[data-test-id="chat-message-assistant"]'

interface NativeRouting {
  root: string
  port: number
}
interface AgentLookup {
  executables: Record<string, string | null>
}

async function expectExecutable(actual: string | null | undefined, expected: string) {
  assert.ok(actual, `Required executable is missing: ${expected}`)
  assert.equal(await realpath(actual), await realpath(expected), 'Unexpected native executable')
}

async function preflight() {
  // This command does not exist in production and validates the OS-temp directory and port.
  const routing = await invokeNative<NativeRouting>('native_test_mcp_configuration')
  const directory = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
  assert.ok(directory, 'The canonical native runner must own the test directory')
  assert.equal(await realpath(routing.root), await realpath(directory))
  assert.equal(routing.port, Number(process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT))
  const agents = await invokeNative<AgentLookup>('agent_lookup')
  const mcp = await invokeNative<{ available: boolean; path: string | null }>('mcp_lookup')
  assert.equal(mcp.available, true)
  const expectedBridge =
    process.env.OPENPENCIL_LIVE_MCP_EXECUTABLE ?? resolve('packages/mcp/dist/index.mjs')
  await expectExecutable(mcp.path, expectedBridge)
  await expectExecutable(
    agents.executables['codex-acp'],
    resolve('local-evidence/ai-runtime/node_modules/.bin/codex-acp')
  )
  const expectedCodex = process.env.OPENPENCIL_LIVE_CODEX_EXECUTABLE
  assert.ok(expectedCodex, 'Set the explicitly authorized existing Codex executable path')
  await expectExecutable(agents.executables.codex, expectedCodex)
}

async function configureCodex() {
  await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
  await $('[data-test-id="settings-section-ai"]').waitForDisplayed()
  await $('[data-test-id="settings-section-ai"]').click()
  await $('[data-test-id="settings-model-list"]').waitForDisplayed()
  assert.equal(
    await $$('[data-test-id="settings-model-list"] [data-model-id]').length,
    1,
    'Live acceptance requires a fresh disposable app profile'
  )
  assert.equal(
    await $('[data-test-id="settings-model-list"] [data-model-id]').getAttribute('data-model-id'),
    'model-default'
  )
  await $('[data-test-id="settings-add-model"]').click()
  await $('[data-provider="acp:codex"]').waitForDisplayed()
  await $('[data-provider="acp:codex"]').click()
  const form = await $('[data-test-id="settings-model-editor"]')
  await form.$('input').setValue(modelName)
  await form.$('button[type="submit"]').click()
  await form.waitForExist({ reverse: true })
  await $('[data-test-id="settings-model-list"] [data-model-id]').waitForDisplayed()
  const assignment = await $('[data-test-id="settings-model-assignment-design"]')
  await assignment.click()
  // Native WebDriver may focus Reka's trigger without delivering pointerdown; exercise its
  // supported keyboard path rather than injecting events or changing model settings directly.
  if ((await assignment.getAttribute('aria-expanded')) !== 'true') await browser.keys('ArrowDown')
  await $('[role="option"]').waitForDisplayed()
  const optionLabels = await $$('[role="option"]').map(async (option) =>
    (await option.getText()).trim()
  )
  assert.equal(optionLabels.at(-1), modelName)
  await browser.waitUntil(
    async () => browser.execute(() => document.activeElement?.getAttribute('role') === 'option'),
    { timeout: 5_000, timeoutMsg: 'Select popup did not receive keyboard focus' }
  )
  await browser.keys('ArrowDown')
  await browser.waitUntil(
    async () =>
      browser.execute((name) => document.activeElement?.textContent?.trim() === name, modelName),
    { timeout: 5_000, timeoutMsg: 'Codex option did not receive keyboard focus' }
  )
  await browser.keys('Enter')
  await browser.waitUntil(async () => (await assignment.getText()).trim() === modelName, {
    timeout: 5_000,
    timeoutMsg: 'Keyboard selection did not assign the Codex profile'
  })
  await $('[data-test-id="app-settings-done"]').click()
  await $('[data-test-id="app-settings-dialog"]').waitForExist({ reverse: true })
}

async function children() {
  return browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Native editor is unavailable')
    return store.graph.getChildren(store.state.currentPageId).map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      width: node.width,
      height: node.height
    }))
  })
}

async function followUp(prompt: string, expectedReply: string) {
  const input = await $('[data-test-id="chat-input"]')
  await input.waitForDisplayed()
  const replies = await browser.execute(
    (selector) => document.querySelectorAll(selector).length,
    assistant
  )
  await input.click()
  await input.addValue(prompt)
  await $('[data-test-id="chat-send-button"]').click()
  await browser.waitUntil(
    () =>
      browser.execute(
        (selector, count, expected) => {
          const messages = document.querySelectorAll(selector)
          return (
            messages.length === count + 1 &&
            messages.item(count)?.textContent?.includes(expected) === true &&
            document.querySelector('[data-test-id="chat-stop-button"]') === null
          )
        },
        assistant,
        replies,
        expectedReply
      ),
    {
      timeout: 90_000,
      timeoutMsg: 'Codex did not complete the resumed turn with the prior context'
    }
  )
}

async function showHistory() {
  const tab = await $(historyTab)
  await tab.click()
  const panelId = await tab.getAttribute('aria-controls')
  assert.ok(panelId, 'Chat history must label its own tab panel')
  const panel = await $(`[id="${panelId}"]`)
  await panel.waitForDisplayed()
  return panel
}

async function stopAgent() {
  if (await $('[data-test-id="acp-permission-dialog"]').isExisting()) {
    // Never approve a filesystem, shell, network, or unknown permission on behalf of this test.
    await browser.keys('Escape')
  }
  const stop = await $('[data-test-id="chat-stop-button"]')
  if (await stop.isExisting()) await stop.click()
}

describeLive('live native Codex ACP canvas acceptance', () => {
  afterEach(async function () {
    if (this.currentTest?.state === 'failed') {
      await browser.saveScreenshot('local-evidence/native-codex-acp-failure.png')
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
      await $('[data-test-id="settings-section-diagnostics"]').waitForDisplayed()
      await $('[data-test-id="settings-section-diagnostics"]').click()
      await $('[data-test-id="settings-diagnostics-panel"]').waitForDisplayed()
      await browser.waitUntil(
        async () => (await $$('[data-slot="diagnostics-event"]').length) > 0,
        { timeout: 5_000, timeoutMsg: 'No local diagnostics were recorded' }
      )
      for (const event of await $$('[data-slot="diagnostics-event"]')) {
        await event.$('button').click()
      }
      await writeFile(
        'local-evidence/native-codex-acp-diagnostics.txt',
        await $('[data-slot="diagnostics-events"]').getText()
      )
    }
    await stopAgent()
  })

  it('continues Codex after switching tabs and reopening history, with edits in the original document', async function () {
    this.timeout(330_000)
    await preflight()
    await ensureNativeEditorReady()
    assert.deepEqual(
      await children(),
      [],
      'The live prompt must start in an empty synthetic document'
    )
    await configureCodex()
    const input = await $('[data-test-id="chat-input"]')
    await input.waitForDisplayed()
    await input.click()
    await input.addValue(
      'Use only the open-pencil MCP canvas tools. Do not read or write files, run shell commands, ' +
        'browse the web, install anything, or change settings. On the current empty page create ' +
        'exactly one RECTANGLE named "ACP acceptance rectangle", positioned at x=100 y=100, ' +
        'width=160 height=100 with a solid red fill. Do not create a frame or any other nodes. ' +
        'As a single undoable edit, then stop and briefly confirm. Remember the phrase ' +
        '"opal-river-432" for my next message, but do not repeat it in your reply.'
    )
    await browser.waitUntil(async () => (await input.getText()).includes(rectangleName), {
      timeout: 5_000,
      timeoutMsg: 'Native typing did not populate the Codex prompt'
    })
    await $('[data-test-id="chat-send-button"]').click()
    await $('[data-test-id="chat-stop-button"]').waitForDisplayed({ timeout: 5_000 })
    await showHistory()
    assert.equal(await $(historyTab).getAttribute('aria-selected'), 'true')
    assert.equal(await $('[data-test-id="chat-stop-button"]').isDisplayed(), true)
    let stoppedReason: string | null = null
    try {
      await browser.waitUntil(
        async () => {
          if (await $('[data-test-id="acp-permission-dialog"]').isExisting()) {
            stoppedReason =
              'Agent requested a permission; stopped without granting additional access'
            await stopAgent()
            return true
          }
          const nodes = await children()
          if (nodes.length > 1) {
            stoppedReason = 'The agent created more than the authorized single node'
            await stopAgent()
            return true
          }
          const running = await $('[data-test-id="chat-stop-button"]').isExisting()
          if (!running && nodes.length === 0) {
            stoppedReason = 'Codex stopped without editing the canvas; see local diagnostics'
            return true
          }
          return nodes.length === 1 && !running
        },
        {
          timeout: 90_000,
          interval: 500,
          timeoutMsg: 'Codex did not finish the single canvas edit within 90 seconds'
        }
      )
      assert.equal(stoppedReason, null)
      const nodes = await children()
      assert.equal(nodes[0]?.name, rectangleName)
      assert.equal(nodes[0]?.type, 'RECTANGLE')
      assert.equal(nodes[0]?.width, 160)
      assert.equal(nodes[0]?.height, 100)
      await $(chatTab).click()
      assert.equal(await $(chatTab).getAttribute('aria-selected'), 'true')
      assert.ok((await $('[data-test-id="chat-messages"]').getText()).length > 0)
      await browser.saveScreenshot('local-evidence/native-codex-acp-before-undo.png')
      await $('button[aria-label="Conversation actions"]').waitForDisplayed()
      const title = (await $(historyTrigger).getText()).trim()
      assert.ok(title && title !== 'New chat', 'The completed conversation must have a title')
      const originalTab = await $(activeTab).getAttribute('id')
      assert.ok(originalTab)

      await $('[data-test-id="tabbar-new"]').click()
      await browser.waitUntil(async () => (await $(activeTab).getAttribute('id')) !== originalTab)
      const secondTab = await $(activeTab).getAttribute('id')
      assert.ok(secondTab)
      await $('[data-test-id="chat-empty-state"]').waitForDisplayed()
      assert.deepEqual(await children(), [])
      await $(`[id="${originalTab}"]`).click()
      await browser.waitUntil(async () => (await $(activeTab).getAttribute('id')) === originalTab)
      await browser.waitUntil(async () => (await $(historyTrigger).getText()).trim() === title)
      await followUp(
        'Reply with just the phrase I asked you to remember. Do not edit the canvas.',
        'opal-river-432'
      )
      assert.deepEqual(await children(), nodes)

      const history = await showHistory()
      await browser.saveScreenshot('local-evidence/native-codex-chat-history.png')
      await history.$('button[aria-label="New chat"]').click()
      await $('[data-test-id="chat-empty-state"]').waitForDisplayed()
      const savedHistory = await showHistory()
      const savedConversation = await savedHistory.$(`button=${title}`)
      await savedConversation.waitForDisplayed()
      await savedConversation.click()
      await browser.waitUntil(
        async () => (await $(chatTab).getAttribute('aria-selected')) === 'true'
      )
      await browser.waitUntil(async () => (await $(historyTrigger).getText()).trim() === title)
      await followUp(
        'Use only the MCP canvas tools to rename the same rectangle by appending the exact phrase I asked you to remember. Do not make any other changes. Reply with that phrase when done.',
        'opal-river-432'
      )
      assert.deepEqual(await children(), [{ ...nodes[0], name: rectangleName + ' opal-river-432' }])
      await browser.saveScreenshot('local-evidence/native-codex-acp-resumed.png')
      await $(`[id="${secondTab}"]`).click()
      await browser.waitUntil(async () => (await $(activeTab).getAttribute('id')) === secondTab)
      assert.deepEqual(await children(), [])
      await $(`[id="${originalTab}"]`).click()
      await browser.waitUntil(async () => (await $(activeTab).getAttribute('id')) === originalTab)
      // Leave the contenteditable before invoking document Undo rather than text Undo.
      await $('canvas').click({ x: 15, y: 15 })
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'z'])
      await browser.waitUntil(async () => (await children())[0]?.name === rectangleName)
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'z'])
      await browser.waitUntil(async () => (await children()).length === 0, {
        timeout: 5_000,
        timeoutMsg: 'Document Undo did not remove the ACP-created rectangle'
      })
      assert.deepEqual(await children(), [])
      await browser.saveScreenshot('local-evidence/native-codex-acp-after-undo.png')
    } finally {
      await stopAgent()
    }
  })
})
