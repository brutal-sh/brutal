import { strict as assert } from 'node:assert'
import { realpath } from 'node:fs/promises'
import { resolve } from 'node:path'

import { invokeNative } from '#tests/helpers/tauri/invoke'

// Explicitly opt in: this sends one real prompt through the already signed-in Codex CLI.
// Run this spec alone in the disposable native-test app; never install or sign in here.
const live = process.env.OPENPENCIL_LIVE_CODEX_ACP === '1'
const describeLive = live ? describe : describe.skip
const rectangleName = 'ACP acceptance rectangle'
const modelName = 'Native Codex acceptance'

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
  await expectExecutable(mcp.path, resolve('packages/mcp/dist/index.mjs'))
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
  await $('[data-test-id="settings-model-list"] [data-model-id]').waitForDisplayed()
  await $('[data-test-id="settings-model-assignment-design"]').click()
  await $(`[role="option"]=${modelName}`).click()
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

async function stopAgent() {
  if (await $('[data-test-id="acp-permission-dialog"]').isExisting()) {
    // Never approve a filesystem, shell, network, or unknown permission on behalf of this test.
    await browser.keys('Escape')
  }
  const stop = await $('[data-test-id="chat-stop-button"]')
  if (await stop.isExisting()) await stop.click()
}

describeLive('live native Codex ACP canvas acceptance', () => {
  it('uses existing login through native chat and MCP, creates one rectangle, and undoes it', async function () {
    this.timeout(150_000)
    const mainHandle = await browser.getWindowHandle()
    await browser.switchToWindow(mainHandle)
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'Native editor did not initialize' }
    )
    await preflight()
    const newDesign = await $('button=New design')
    if (await newDesign.isExisting()) await newDesign.click()
    await $('canvas').waitForDisplayed()
    assert.deepEqual(
      await children(),
      [],
      'The live prompt must start in an empty synthetic document'
    )
    await configureCodex()
    const input = await $('[data-test-id="chat-input"]')
    await input.waitForDisplayed()
    await input.click()
    await browser.keys(
      'Use only the open-pencil MCP canvas tools. Do not read or write files, run shell commands, ' +
        'browse the web, install anything, or change settings. On the current empty page create ' +
        'exactly one RECTANGLE named "ACP acceptance rectangle", positioned at x=100 y=100, ' +
        'width=160 height=100 with a solid red fill. Do not create a frame or any other nodes. ' +
        'Make this as one undoable canvas edit, then stop and briefly confirm.'
    )
    await $('[data-test-id="chat-send-button"]').click()
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
          return nodes.length === 1 && !(await $('[data-test-id="chat-stop-button"]').isExisting())
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
      assert.ok((await $('[data-test-id="chat-messages"]').getText()).length > 0)
      await browser.saveScreenshot('local-evidence/native-codex-acp-before-undo.png')
      // Leave the contenteditable before invoking document Undo rather than text Undo.
      await $('canvas').click({ x: 15, y: 15 })
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
