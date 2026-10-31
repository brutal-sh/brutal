import { strict as assert } from 'node:assert'

import * as v from 'valibot'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

async function chooseCommand(search: string) {
  await $('button[aria-label="Command palette"]').click()
  await $('input[aria-label="Search commands"]').setValue(search)
  await $('[role="option"]').waitForDisplayed()
  await browser.keys('ArrowDown')
  await browser.keys('Enter')
}

it('delivers the native guide UI and this fork’s CLI setup link without changing selection', async () => {
  const { first } = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), first)
  const before = await browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Native editor unavailable')
    return { selected: [...store.state.selectedIds], dirty: store.hasUnsavedChanges() }
  })
  await chooseCommand('Guide: How to Export Design to Code')
  await $('[role="dialog"]').waitForDisplayed()
  const titleId = await $('[role="dialog"]').getAttribute('aria-labelledby')
  assert.ok(titleId, 'Guide has no accessible title')
  const dialog = await $(`[role="dialog"][aria-labelledby="${titleId}"]`)
  assert.ok((await dialog.getText()).includes('openpen-mcp-http'))
  const configuration = v.parse(
    v.object({ port: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(65535)) }),
    await invokeNative('native_test_mcp_configuration')
  )
  assert.ok((await dialog.getText()).includes(`http://127.0.0.1:${configuration.port}/mcp`))
  await dialog.$('button=Open MCP settings').click()
  await dialog.waitForExist({ reverse: true })
  await $('[data-test-id="settings-mcp-panel"]').waitForDisplayed()
  await $('[data-test-id="app-settings-done"]').click()
  await $('[data-test-id="app-settings-dialog"]').waitForExist({ reverse: true })
  await chooseCommand('Guide: How to Import from Figma')
  const guide = await $('[data-slot="toast"][data-tone="info"]')
  await guide.waitForDisplayed()
  await guide.$('button=Close').click()
  await guide.waitForExist({ reverse: true })
  await invokeNative('take_native_test_opened_urls')
  await chooseCommand('Install Open Pen CLI')
  await browser.waitUntil(async () =>
    (await invokeNative<string[]>('take_native_test_opened_urls')).includes(
      'https://github.com/jpoindexter/open-pen#cli'
    )
  )
  assert.deepEqual(
    await browser.execute(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Native editor unavailable')
      return { selected: [...store.state.selectedIds], dirty: store.hasUnsavedChanges() }
    }),
    before
  )
})

it('routes native Help events from Home without creating a document', async () => {
  await $('[role="tab"][aria-label="Home"]').click()
  const before = await $$('[data-slot="tab-bar"] [role="tab"]').length
  for (const [id, path] of [
    ['help-documentation', '/blob/HEAD/README.md'],
    ['help-prompts', '/blob/HEAD/docs/PROMPTS.md'],
    ['help-website', ''],
    ['help-cursor', '/blob/HEAD/docs/EDITOR-INTEGRATIONS.md#cursor'],
    ['help-vscode', '/blob/HEAD/docs/EDITOR-INTEGRATIONS.md#vs-code'],
    ['help-support', '/issues']
  ]) {
    await invokeNative('take_native_test_opened_urls')
    await browser.execute(async (id) => {
      const event = window.__TAURI__?.event
      if (!event) throw new Error('Native event API unavailable')
      await event.emit('menu-event', id)
    }, id)
    await browser.waitUntil(async () =>
      (await invokeNative<string[]>('take_native_test_opened_urls')).includes(
        `https://github.com/jpoindexter/open-pen${path}`
      )
    )
    assert.equal(await $('[role="tab"][aria-label="Home"]').getAttribute('aria-selected'), 'true')
    assert.equal(await $$('[data-slot="tab-bar"] [role="tab"]').length, before)
  }
})
