import { strict as assert } from 'node:assert'

import {
  createNativeLayerFixture,
  ensureNativeEditorReady
} from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

async function editorState() {
  return browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Native editor unavailable')
    return {
      origin: performance.timeOrigin,
      page: store.state.currentPageId,
      scene: store.state.sceneVersion,
      selection: [...store.state.selectedIds]
    }
  })
}

it('restores a hidden macOS test application without replacing its editor', async function () {
  if (process.platform !== 'darwin') return this.skip()
  await createNativeLayerFixture()
  const before = await editorState()
  try {
    await invokeNative('plugin:app|app_hide')
    await browser.waitUntil(() => browser.execute(() => document.hidden))
    await ensureNativeEditorReady()
    assert.equal(await browser.execute(() => document.hidden), false)
    assert.deepEqual(await editorState(), before)
  } finally {
    await invokeNative('plugin:app|app_show')
    await invokeNative('plugin:window|set_focus', { label: 'main' })
  }
})
