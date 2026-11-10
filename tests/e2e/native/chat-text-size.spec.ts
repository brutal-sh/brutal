import { strict as assert } from 'node:assert'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'
import { reloadNativeEditor } from '#tests/helpers/tauri/navigation'

async function selectOption(selector: string, label: string) {
  const trigger = await $(selector)
  await trigger.click()
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await browser.keys('ArrowDown')
  await $('[role="option"]').waitForDisplayed()
  const labels = await $$('[role="option"]').map(async (option) => (await option.getText()).trim())
  const index = labels.indexOf(label)
  assert.ok(index !== -1, `Missing option: ${label}`)
  await browser.waitUntil(async () =>
    browser.execute(() => document.activeElement?.getAttribute('role') === 'option')
  )
  const focused = await browser.execute(() => document.activeElement?.textContent?.trim())
  let position = labels.indexOf(focused ?? '')
  assert.ok(position !== -1, 'Select focused an unknown option')
  while (position !== index) {
    const direction = position < index ? 1 : -1
    await browser.keys(direction === 1 ? 'ArrowDown' : 'ArrowUp')
    position += direction
    const expectedLabel = labels[position]
    await browser.waitUntil(async () =>
      browser.execute(
        (label) => document.activeElement?.textContent?.trim() === label,
        expectedLabel
      )
    )
  }
  await browser.keys('Enter')
  await browser.waitUntil(async () => (await trigger.getText()).trim() === label)
}

async function installTransport() {
  await browser.execute(() => {
    const override = window.openPencil?.setChatTransport
    if (!override) throw new Error('Chat transport override unavailable')
    override(() => ({
      async sendMessages() {
        return new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'start', messageId: 'native-font-sample' })
            controller.enqueue({ type: 'text-start', id: 'native-text' })
            controller.enqueue({
              type: 'text-delta',
              id: 'native-text',
              delta: 'Native type sample'
            })
            controller.enqueue({ type: 'text-end', id: 'native-text' })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          }
        })
      },
      async reconnectToStream() {
        return null
      }
    }))
  })
}

async function openSettings() {
  await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
  await $('[data-test-id="settings-section-ai"]').waitForDisplayed()
  await $('[data-test-id="settings-section-ai"]').click()
}

async function closeSettings() {
  await $('[data-test-id="app-settings-done"]').click()
  await $('[data-test-id="app-settings-dialog"]').waitForExist({ reverse: true })
}

async function submitSample() {
  await installTransport()
  const input = await $('[data-test-id="chat-input"]')
  await input.setValue('Native transcript type sample')
  await input.click()
  await browser.keys('Enter')
  await $(
    '[data-test-id="chat-message-assistant"] [data-test-id="chat-text-bubble"]'
  ).waitForDisplayed()
}

async function expectFont(pixels: string, markdownPixels: string, composerSize: string) {
  await browser.waitUntil(async () =>
    browser.execute((expected) => {
      const bubbles = document.querySelectorAll('[data-test-id="chat-text-bubble"]')
      return (
        bubbles.length >= 2 &&
        [...bubbles].every((bubble) => getComputedStyle(bubble).fontSize === expected)
      )
    }, pixels)
  )
  const paragraph = await $('[data-test-id="chat-message-assistant"] [data-stream-markdown="p"]')
  await browser.waitUntil(
    async () => (await paragraph.getCSSProperty('font-size')).value === markdownPixels
  )
  assert.equal(
    await $('[data-test-id="chat-input"]')
      .getCSSProperty('font-size')
      .then((value) => value.value),
    composerSize
  )
}

describe('native chat text size', () => {
  afterEach(async function () {
    if (this.currentTest?.state === 'failed') {
      console.error(await browser.execute(() => document.body.innerText.slice(0, 5000)))
    }
  })
  it('resizes transcript fonts, synchronizes native checks and retains the preference after reload', async () => {
    await createNativeLayerFixture()
    await $('[role="tablist"][aria-label="Workspace panels"] [role="tab"]').waitForDisplayed()
    await $('[role="tablist"][aria-label="Workspace panels"] [role="tab"]').click()
    await $('[data-test-id="provider-setup-open-settings"]').click()
    await $('[data-model-id]').waitForDisplayed()
    await $('[data-model-id]').click()
    await selectOption('[data-test-id="settings-model-provider"]', 'OpenRouter')
    await $('input[aria-label="Name"]').setValue('Native font test')
    await $('[data-test-id="provider-settings-api-key"]').setValue('synthetic-native-font-test')
    const form = await $('[data-test-id="settings-model-editor"]')
    await form.$('button[type="submit"]').click()
    await form.waitForExist({ reverse: true })
    await closeSettings()
    await submitSample()
    const composerSize = await $('[data-test-id="chat-input"]')
      .getCSSProperty('font-size')
      .then((value) => value.value)
    assert.ok(composerSize)
    await expectFont('12px', '11px', composerSize)
    for (const [label, pixels, markdownPixels] of [
      ['Medium', '12.9px', '11.825px'],
      ['Large', '13.8px', '12.65px']
    ] as const) {
      await openSettings()
      await selectOption('button[role="combobox"][aria-label="Agent Chat Text Size"]', label)
      for (const size of ['small', 'medium', 'large']) {
        await browser.waitUntil(
          async () =>
            (await invokeNative<boolean>('native_menu_checked', { id: `agent-text-${size}` })) ===
            (size === label.toLowerCase())
        )
      }
      await closeSettings()
      await expectFont(pixels, markdownPixels, composerSize)
    }
    await reloadNativeEditor()
    await createNativeLayerFixture()
    await $('[role="tablist"][aria-label="Workspace panels"] [role="tab"]').waitForDisplayed()
    await $('[role="tablist"][aria-label="Workspace panels"] [role="tab"]').click()
    await submitSample()
    await expectFont('13.8px', '12.65px', composerSize)
    assert.equal(
      await invokeNative<boolean>('native_menu_checked', { id: 'agent-text-large' }),
      true
    )
  })
})
