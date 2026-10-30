import { strict as assert } from 'node:assert'

function settingsOpen(): Promise<boolean> {
  return browser.execute(() =>
    Boolean(document.querySelector('[data-test-id="app-settings-dialog"]'))
  )
}

describe('native preferences', () => {
  before(async () => {
    const mainHandle = await browser.getWindowHandle()
    await browser.switchToWindow(mainHandle)
  })
  it('opens Settings with the platform shortcut while an input is focused', async () => {
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'OpenPencil editor did not initialize' }
    )
    await browser.execute(() => {
      const input = document.createElement('input')
      input.setAttribute('data-test-id', 'native-settings-shortcut-input')
      document.body.append(input)
    })
    const input = await $('[data-test-id="native-settings-shortcut-input"]')
    await input.click()
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await browser.waitUntil(settingsOpen, {
      timeout: 10_000,
      timeoutMsg: 'Native settings shortcut did not open Settings'
    })

    assert.equal(await settingsOpen(), true)
    await browser.keys('Escape')
    await browser.waitUntil(async () => !(await settingsOpen()))
    await browser.execute(() =>
      document.querySelector('[data-test-id="native-settings-shortcut-input"]')?.remove()
    )
  })

  it('keeps editor snapping synchronized with Settings and retains it when reopened', async () => {
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'OpenPencil editor did not initialize' }
    )
    const initial = await browser.execute(
      () => window.openPencil?.getStore?.().state.snappingPreferences.objects
    )
    assert.equal(typeof initial, 'boolean')

    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await browser.waitUntil(settingsOpen, {
      timeout: 10_000,
      timeoutMsg: 'Settings did not open for the snapping checkmark test'
    })
    // Spec files share one app process, so select the section this test needs
    // instead of assuming the dialog opened on it.
    await (await $('[data-test-id="settings-section-editor"]')).click()
    await (await $('[data-test-id="settings-snap-objects"]')).waitForDisplayed({ timeout: 10_000 })
    await (await $('[data-test-id="settings-snap-objects"]')).click()
    await browser.waitUntil(
      async () =>
        (await browser.execute(
          () => window.openPencil?.getStore?.().state.snappingPreferences.objects
        )) === !initial,
      { timeout: 5_000, timeoutMsg: 'Editor snapping did not follow the preference' }
    )
    const updated = await browser.execute(
      () => window.openPencil?.getStore?.().state.snappingPreferences.objects
    )
    assert.equal(updated, !initial)
    await browser.keys('Escape')
    await browser.waitUntil(async () => !(await settingsOpen()))
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await browser.waitUntil(settingsOpen)
    await (await $('[data-test-id="settings-section-editor"]')).click()
    const control = await $('[data-test-id="settings-snap-objects"]')
    await control.waitForDisplayed()
    assert.equal(await control.getAttribute('aria-checked'), String(!initial))
    // Restore the original preference for later specs sharing this app process.
    await control.click()
    await browser.waitUntil(
      async () =>
        (await browser.execute(
          () => window.openPencil?.getStore?.().state.snappingPreferences.objects
        )) === initial
    )
    await browser.keys('Escape')
  })
})
