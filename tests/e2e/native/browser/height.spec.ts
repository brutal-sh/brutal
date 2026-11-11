import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import { prepareNativeBrowserViewport } from '#tests/helpers/tauri/browser/preferences'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let origin: string
let ownsPreview = false
const gripSelector = '[role="separator"][aria-label="Browser import height"]'

before(async function () {
  if (process.platform !== 'darwin') this.skip()
  await prepareNativeBrowserViewport()
  await createNativeLayerFixture()
  server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(`<!doctype html><title>Clip height fixture</title><style>
      html,body{margin:0}body{height:1800px;background:#e4e4e7}
      section{position:absolute;width:200px;height:120px;left:32px;background:#6b5cff}
      </style><section style="top:32px"></section><section style="top:1500px"></section>`)
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing clip fixture address')
  origin = `http://127.0.0.1:${address.port}`
  await $('button[aria-label="Browser preview"]').click()
  ownsPreview = true
  const input = $('input[aria-label="Web address"]')
  await input.waitForEnabled()
  await input.setValue(origin)
  await browser.execute(() =>
    document.querySelector('input[aria-label="Web address"]')?.closest('form')?.requestSubmit()
  )
  await browser.waitUntil(async () => {
    const status = await invokeNative<{ url: string; loading: boolean }>('browser_preview_status')
    return status.url === `${origin}/` && !status.loading
  })
  await $(gripSelector).waitForDisplayed()
  await browser.waitUntil(async () => {
    const maximum = Number(await $(gripSelector).getAttribute('aria-valuemax'))
    return maximum > 0 && Number(await $(gripSelector).getAttribute('aria-valuenow')) === maximum
  })
})

after(async () => {
  if (ownsPreview) {
    await browser.releaseActions().catch(() => undefined)
    await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
  }
  server?.close()
})

async function focusGrip() {
  // Focus is setup; readiness and key delivery are checked in the actual isolated WebView.
  await browser.waitUntil(() =>
    $(gripSelector)
      .getAttribute('aria-disabled')
      .then((value) => value === 'false')
  )
  await browser.execute(
    (selector) => document.querySelector<HTMLElement>(selector)?.focus(),
    gripSelector
  )
  assert.equal(await $(gripSelector).isFocused(), true)
}

async function importedRoot() {
  return browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing editor')
    const id = [...store.state.selectedIds][0]
    const node = id ? store.graph.getNode(id) : undefined
    if (!node) return null
    return {
      id: node.id,
      height: node.height,
      clipsContent: node.clipsContent,
      panels: [...store.graph.nodes.values()]
        .filter(
          (child) =>
            child.width === 200 &&
            child.height === 120 &&
            store.graph.isDescendant(child.id, node.id)
        )
        .map((child) => ({ id: child.id, y: child.y }))
    }
  })
}

async function undoImport(id: string) {
  await browser.execute(() => window.openPencil?.getStore?.().undoAction())
  assert.equal(
    await browser.execute(
      (id) => window.openPencil?.getStore?.().graph.getNode(id) === undefined,
      id
    ),
    true
  )
}

it('clips the real browser through the focused height control and imports editable descendants with one Undo', async () => {
  await focusGrip()
  const initial = Number(await $(gripSelector).getAttribute('aria-valuenow'))
  await browser.keys('ArrowUp')
  try {
    await browser.waitUntil(() =>
      $(gripSelector)
        .getAttribute('aria-valuenow')
        .then((v) => Number(v) === initial - 10)
    )
  } catch (reason) {
    throw new Error(
      `${String(reason)}; initial=${initial}; current=${await $(gripSelector).getAttribute('aria-valuenow')}; maximum=${await $(gripSelector).getAttribute('aria-valuemax')}`
    )
  }
  await $('[data-slot="browser-height-clipped"]').waitForDisplayed()
  const importHeight = await browser.execute(() => {
    const surface = document.querySelector('[data-test-id="browser-preview-surface"]')
    if (!surface) throw new Error('Missing browser surface')
    return Math.floor(surface.getBoundingClientRect().height / 0.5)
  })
  const button = $('button[aria-label="Import editable page"]')
  await button.waitForEnabled()
  await button.click()
  await browser.waitUntil(async () => (await importedRoot())?.height === importHeight)
  const root = await importedRoot()
  assert.ok(root)
  assert.equal(root.clipsContent, true)
  assert.equal(root.panels.length, 2, 'Clipping must retain both editable fixture panels')
  assert.ok(
    root.panels.some((panel) => panel.y === 1500),
    'The off-edge panel must remain editable'
  )
  await undoImport(root.id)
})

it('restores full preview height through the focused grip and imports the full page with one Undo', async () => {
  await focusGrip()
  await browser.keys('Enter')
  await $('[data-slot="browser-height-clipped"]').waitForExist({ reverse: true })
  const button = $('button[aria-label="Import editable page"]')
  await button.waitForEnabled()
  await button.click()
  await browser.waitUntil(async () => (await importedRoot())?.height === 1800)
  const root = await importedRoot()
  assert.ok(root)
  assert.equal(root.panels.length, 2)
  await undoImport(root.id)
  await $('[data-slot="browser-height-clipped"]').waitForExist({ reverse: true })
})

it('double-click restores the browser height without adding a design root', async () => {
  await focusGrip()
  await browser.keys('ArrowUp')
  await $('[data-slot="browser-height-clipped"]').waitForDisplayed()
  const roots = () =>
    browser.execute(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing editor')
      return store.graph.getChildren(store.state.currentPageId).map((node) => node.id)
    })
  const before = await roots()
  const importButton = $('button[aria-label="Import editable page"]')
  await importButton.waitForEnabled()
  await browser.executeAsync((selector, done) => {
    const grip = document.querySelector(selector)
    if (!grip) throw new Error('Missing height control')
    grip.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    // Flush queued reset/import work without animation frames paused by native child focus.
    setTimeout(done, 0)
  }, gripSelector)
  await $('[data-slot="browser-height-clipped"]').waitForExist({ reverse: true })
  await $('button[aria-label="Import editable page"]').waitForEnabled()
  assert.deepEqual(await roots(), before)
})

it('Tablet imports the complete editable page at the reduced preview height', async () => {
  for (const label of ['Viewport: Desktop. Switch to Phone', 'Viewport: Phone. Switch to Tablet']) {
    const choice = $(`button[aria-label="${label}"]`)
    await choice.waitForEnabled()
    await choice.click()
  }
  await $('button[aria-label="Viewport: Tablet. Switch to Desktop"]').waitForDisplayed()
  await focusGrip()
  await browser.keys('ArrowUp')
  await $('[data-slot="browser-height-clipped"]').waitForDisplayed()
  const button = $('button[aria-label="Import editable page"]')
  await button.waitForEnabled()
  const previousId = (await importedRoot())?.id
  await button.click()
  await browser.waitUntil(async () => {
    const root = await importedRoot()
    return !!root && root.id !== previousId
  })
  const root = await importedRoot()
  assert.ok(root)
  assert.equal(root.height, 1800)
  assert.equal(root.panels.length, 2)
  assert.ok(root.panels.some((panel) => panel.y === 1500))
  await undoImport(root.id)
})
