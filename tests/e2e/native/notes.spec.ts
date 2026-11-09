import { strict as assert } from 'node:assert'

import { repoPath } from '#tests/helpers/paths'
import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { emitNativeMenuAction } from '#tests/helpers/tauri/invoke'

it('creates, recolors and detaches a Note component with native menu history', async () => {
  await ensureNativeEditorReady()
  const id = await browser.execute<string, []>(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Native editor unavailable')
    return store.createNote(store.state.currentPageId, { x: 60, y: 60 }).id
  })
  const create = await $('button=Create Component')
  await create.waitForDisplayed()
  await create.click()
  const detach = await $('button=Detach Component')
  await detach.waitForDisplayed()
  const purple = await $('button[aria-label="Purple"]')
  await purple.click()
  await browser.waitUntil(() =>
    browser.execute((nodeId) => {
      const note = window.openPencil?.getStore?.().graph.getNode(nodeId)
      const color = note?.fills?.[0]?.color
      return color?.r === 220 / 255 && color.g === 197 / 255
    }, id)
  )
  await browser.saveScreenshot(
    repoPath('local-evidence/note-sizing-components-2026-11-09/native-component-inspector.png')
  )
  await detach.click()
  const state = () =>
    browser.execute((nodeId) => {
      const store = window.openPencil?.getStore?.()
      return {
        type: store?.graph.getNode(nodeId)?.type,
        selected: [...(store?.state.selectedIds ?? [])]
      }
    }, id)
  await browser.waitUntil(async () => (await state()).type === 'FRAME')
  await emitNativeMenuAction('edit.undo')
  await browser.waitUntil(async () => (await state()).type === 'COMPONENT')
  assert.deepEqual((await state()).selected, [id])
  const restoredDetach = await $('button=Detach Component')
  await restoredDetach.scrollIntoView()
  await restoredDetach.waitForDisplayed()
  await browser.saveScreenshot(
    repoPath(
      'local-evidence/note-sizing-components-2026-11-09/native-restored-component-header.png'
    )
  )
  await emitNativeMenuAction('edit.redo')
  await browser.waitUntil(async () => (await state()).type === 'FRAME')
  assert.deepEqual((await state()).selected, [id])
})
