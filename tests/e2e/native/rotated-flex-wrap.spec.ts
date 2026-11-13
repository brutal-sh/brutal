import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { testPath } from '#tests/helpers/paths'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { emitNativeMenuAction } from '#tests/helpers/tauri/invoke'

async function prepareRotatedInput() {
  await ensureNativeEditorReady()
  const data = await readFile(testPath('fixtures/pen-rotated-flex-wrap.pen'), 'utf8')
  await browser.execute((text) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([text], 'Rotated wrap.pen', { type: 'application/json' }))
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
  }, data)
  await browser.waitUntil(() =>
    browser.execute(() => Boolean(window.openPencil?.getStore?.().graph.getNode('wrap-b')))
  )
  await browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    const canvas = document.querySelector('[data-test-id="canvas-element"]')
    if (!store || !canvas) throw new Error('Native editor unavailable')
    const bounds = canvas.getBoundingClientRect()
    store.state.zoom = 1
    store.state.panX = 100 + Math.floor(bounds.left) - bounds.left
    store.state.panY = 180 + Math.floor(bounds.top) - bounds.top
    store.select(['wrap-a', 'wrap-b'])
    store.requestRender()
  })
  return rootGeometry()
}

function rootGeometry() {
  return browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Native editor unavailable')
    return store.graph
      .getChildren(store.state.currentPageId)
      .map(({ id, x, y, width, height, rotation }) => ({ id, x, y, width, height, rotation }))
  })
}

async function expectDimensions(width: number, height: number) {
  await browser.waitUntil(
    async () => {
      const w = await $('[role="spinbutton"][aria-label="Width"]').getAttribute('aria-valuenow')
      const h = await $('[role="spinbutton"][aria-label="Height"]').getAttribute('aria-valuenow')
      return w === String(width) && h === String(height)
    },
    { timeoutMsg: `Native wrapper did not reach ${width} × ${height}` }
  )
}

async function saveNativeCapture(name: string) {
  const directory = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
  if (!directory) throw new Error('Native capture directory unavailable')
  const path = join(directory, `${name}.png`)
  await browser.saveScreenshot(path)
  console.warn(`Native rotated-wrap capture: ${path}`)
}

it('delivers measured rotated Add flex, menu history and later gap reflow in the native WebView', async () => {
  const original = await prepareRotatedInput()
  await (await $('button[aria-label="Add flex layout"]')).click()
  await expectDimensions(180, 80)
  await saveNativeCapture('rotated-flex-initial')
  assert.equal(
    await $('[role="checkbox"][aria-label="Hug Width"]').getAttribute('aria-checked'),
    'true'
  )
  await emitNativeMenuAction('edit.undo')
  await browser.waitUntil(async () => (await rootGeometry()).length === original.length)
  assert.deepEqual(await rootGeometry(), original)
  await emitNativeMenuAction('edit.redo')
  await expectDimensions(180, 80)
  await (await $('[role="spinbutton"][aria-label="Fixed gap amount"]')).click()
  const gap = await $('input[role="spinbutton"][aria-label="Fixed gap amount"]')
  await gap.waitForDisplayed()
  await gap.setValue('61')
  await browser.keys('Tab')
  await expectDimensions(221, 80)
  await saveNativeCapture('rotated-flex-live-gap')
})
