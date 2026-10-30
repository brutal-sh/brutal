import { strict as assert } from 'node:assert'

import { repoPath } from '#tests/helpers/paths'

describe('native Home creation', () => {
  it('retains the dismissed draft and opens browser import in its new document', async () => {
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'Native Home did not initialize' }
    )
    const homeTab = await $('[role="tab"][aria-label="Home"]')
    await homeTab.click()
    const composer = await $('textarea[placeholder="Create anything…"]')
    await composer.waitForDisplayed()
    await composer.setValue('Keep my native Home draft')
    await (await $('button[aria-label="Dismiss"]')).click()
    assert.equal(await composer.isDisplayed(), false)
    const restore = await $('button[aria-label="Show design composer"]')
    await restore.waitForDisplayed()
    assert.equal(await restore.getText(), 'New design')
    await restore.click()
    assert.equal(await composer.getValue(), 'Keep my native Home draft')
    await browser.saveScreenshot(repoPath('local-evidence/native-home-final.png'))
    await (await $('button=Import from browser')).click()
    await (await $('[aria-label="Browser preview"]')).waitForDisplayed()
    await (await $('button[aria-label="Close browser preview"]')).click()
    await browser.waitUntil(
      async () => !(await (await $('[aria-label="Browser preview"]')).isExisting())
    )
    await homeTab.click()
    const documents = await $$('[data-test-id="tabbar-tab"]:not([aria-label="Home"])')
    const count = await documents.length
    assert.ok(count > 0)
    await documents[count - 1].click()
    assert.equal(await (await $('[aria-label="Browser preview"]')).isExisting(), false)
  })
})
