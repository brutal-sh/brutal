import { strict as assert } from 'node:assert'

import { prepareNativeBrowserViewport } from '#tests/helpers/tauri/browser/preferences'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { reloadNativeEditor } from '#tests/helpers/tauri/navigation'

before(async () => {
  await prepareNativeBrowserViewport()
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})

it('retains device choice and the separate responsive zoom across documents and editor reloads', async () => {
  const selected = await browser.executeAsync<{ failure?: string; zoom?: string }, []>(
    async (done) => {
      const wait = async (check: () => boolean, label: string) => {
        const end = Date.now() + 15000
        while (!check()) {
          if (Date.now() > end) throw new Error(`Timed out: ${label}`)
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
        }
      }
      const click = (label: string) => {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!button || button.disabled) throw new Error(`Unavailable ${label}`)
        button.click()
      }
      const menu = async () => {
        click('More options')
        await wait(() => !!document.querySelector('[role="menu"][data-state="open"]'), 'More')
      }
      const item = (label: string) => {
        const node = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
          (node) => node.textContent?.trim() === label
        )
        if (!node || node.hasAttribute('data-disabled')) throw new Error(`Unavailable ${label}`)
        node.click()
      }
      const dismiss = async () => {
        document
          .querySelector('[role="menu"]')
          ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await wait(() => !document.querySelector('[role="menu"][data-state="open"]'), 'menu closed')
      }
      let result: { failure?: string; zoom?: string } = {}
      try {
        click('Import Web via Browser')
        await wait(() => !!document.querySelector('[aria-label="Web address"]'), 'browser dock')
        await menu()
        item('Zoom In')
        await wait(
          () => !document.querySelector('[role="menu"][data-state="open"]'),
          'zoom selected'
        )
        click('Viewport: Desktop. Switch to Phone')
        await wait(
          () => !!document.querySelector('[aria-label="Viewport: Phone. Switch to Tablet"]'),
          'Phone selected'
        )
        await menu()
        result.zoom = [...document.querySelectorAll('[role="menuitem"]')]
          .find((node) => node.textContent?.trim().startsWith('Zoom:'))
          ?.textContent?.trim()
        await dismiss()
        click('Close browser preview')
        const previousPage = window.openPencil?.getStore?.().state.currentPageId
        document
          .querySelector<HTMLButtonElement>('[data-slot="tab-bar"] button[aria-label="New design"]')
          ?.click()
        await wait(
          () =>
            window.openPencil?.getStore?.().state.currentPageId !== previousPage &&
            !!window.openPencil?.getStore?.().textEditor,
          'new document'
        )
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Missing new document')
        const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
          name: 'Viewport preference fixture'
        })
        store.select([node.id])
        await wait(
          () => !!document.querySelector('[aria-label="Import Web via Browser"]'),
          'new document inspector'
        )
        click('Import Web via Browser')
        await wait(
          () => !!document.querySelector('[aria-label="Viewport: Phone. Switch to Tablet"]'),
          'saved Phone in new document'
        )
        await menu()
        if (
          ![...document.querySelectorAll('[role="menuitem"]')].some(
            (node) => node.textContent?.trim() === result.zoom
          )
        )
          throw new Error('New document lost saved fixed zoom')
        await dismiss()
        click('Viewport: Phone. Switch to Tablet')
        await wait(
          () => !!document.querySelector('[aria-label="Viewport: Tablet. Switch to Desktop"]'),
          'Tablet selected'
        )
        click('Viewport: Tablet. Switch to Desktop')
        await wait(
          () => !!document.querySelector('[aria-label="Viewport: Desktop. Switch to Phone"]'),
          'Desktop restored'
        )
        await menu()
        if (
          ![...document.querySelectorAll('[role="menuitem"]')].some(
            (node) => node.textContent?.trim() === 'Zoom: 75%'
          )
        )
          throw new Error('Fixed devices replaced the responsive zoom')
        await dismiss()
        click('Viewport: Desktop. Switch to Phone')
        await wait(
          () => !!document.querySelector('[aria-label="Viewport: Phone. Switch to Tablet"]'),
          'Phone saved for reload'
        )
      } catch (reason) {
        result = { failure: String(reason) }
      } finally {
        document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
      }
      done(result)
    }
  )
  assert.equal(selected.failure, undefined, selected.failure)
  assert.ok(selected.zoom)
  await reloadNativeEditor()
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
  const restored = await browser.executeAsync<{ failure?: string }, []>(async (done) => {
    const wait = async (check: () => boolean) => {
      const end = Date.now() + 15000
      while (!check()) {
        if (Date.now() > end) throw new Error('Saved viewport did not restore')
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
      }
    }
    const click = (label: string) => {
      const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
      if (!button || button.disabled) throw new Error(`Unavailable ${label}`)
      button.click()
    }
    let result: { failure?: string } = {}
    try {
      click('Import Web via Browser')
      await wait(() => !!document.querySelector('[aria-label="Viewport: Phone. Switch to Tablet"]'))
      const address = document.querySelector<HTMLInputElement>('[aria-label="Web address"]')
      if (address?.value !== '') throw new Error('Viewport preferences retained a browsing address')
      click('Viewport: Phone. Switch to Tablet')
      await wait(
        () => !!document.querySelector('[aria-label="Viewport: Tablet. Switch to Desktop"]')
      )
      click('Viewport: Tablet. Switch to Desktop')
      await wait(
        () => !!document.querySelector('[aria-label="Viewport: Desktop. Switch to Phone"]')
      )
      click('More options')
      await wait(() => !!document.querySelector('[role="menu"][data-state="open"]'))
      if (
        ![...document.querySelectorAll('[role="menuitem"]')].some(
          (node) => node.textContent?.trim() === 'Zoom: 75%'
        )
      )
        throw new Error('Reload lost the responsive zoom')
      document
        .querySelector('[role="menu"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    } catch (reason) {
      result = { failure: String(reason) }
    } finally {
      document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
    }
    done(result)
  })
  assert.equal(restored.failure, undefined, restored.failure)
})
