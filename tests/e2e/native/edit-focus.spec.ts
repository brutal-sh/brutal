import { strict as assert } from 'node:assert'

import {
  createNativeLayerFixture,
  createNativeTextFixture,
  readNativeEditorSnapshot,
  selectNativeTextWord
} from '#tests/helpers/tauri/editor-snapshot'
import { emitNativeMenuAction } from '#tests/helpers/tauri/invoke'

it('deletes a Context range, commits on blur and restores it through native Undo', async () => {
  const { first } = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), first)
  await $('button=Context').click()
  const field = await $('textarea[aria-label="Context information"]')
  await field.waitForDisplayed()
  await field.setValue('abcdef')
  await $('canvas').click()
  await field.click()
  await browser.execute(() => {
    const field = document.querySelector('textarea[aria-label="Context information"]')
    if (!(field instanceof HTMLTextAreaElement)) throw new Error('Context unavailable')
    field.setSelectionRange(1, 4)
  })
  await emitNativeMenuAction('selection.delete')
  assert.equal(await field.getValue(), 'aef')
  await $('canvas').click()
  await emitNativeMenuAction('edit.undo')
  await browser.waitUntil(async () => (await field.getValue()) === 'abcdef')
  assert.deepEqual((await readNativeEditorSnapshot()).selectedIds, [first])
})

it('deletes selected canvas text through native menu events without deleting the node', async () => {
  const id = await createNativeTextFixture('')
  await $('textarea[data-canvas-text-input]').addValue('Edit text sample')
  await browser.waitUntil(
    async () => (await readNativeEditorSnapshot()).editingText === 'Edit text sample'
  )
  assert.equal(await selectNativeTextWord(6), 'text')
  await emitNativeMenuAction('selection.delete')
  await browser.waitUntil(
    async () => (await readNativeEditorSnapshot()).editingText === 'Edit  sample'
  )
  let snapshot = await readNativeEditorSnapshot()
  assert.equal(snapshot.editingNodeExists, true)
  assert.equal(snapshot.editingTextId, id)
  assert.equal(snapshot.textNodeCount, 1)
  await emitNativeMenuAction('edit.undo')
  await browser.waitUntil(
    async () => (await readNativeEditorSnapshot()).editingText === 'Edit text sample'
  )
  await emitNativeMenuAction('edit.redo')
  await browser.waitUntil(
    async () => (await readNativeEditorSnapshot()).editingText === 'Edit  sample'
  )
  snapshot = await readNativeEditorSnapshot()
  assert.equal(snapshot.editingNodeExists, true)
  assert.equal(snapshot.editingTextId, id)
})

it('restores a pending native text edit when the document history starts empty', async () => {
  const id = await createNativeTextFixture('abcdef')
  await browser.execute(() => window.openPencil?.getStore?.().undo.clear())
  assert.equal(await browser.execute(() => window.openPencil?.getStore?.().undo.canUndo), false)
  await $('textarea[data-canvas-text-input]').addValue('uvwxyz')
  await browser.waitUntil(async () => (await readNativeEditorSnapshot()).editingText === 'uvwxyz')
  await emitNativeMenuAction('edit.undo')
  await browser.waitUntil(async () => (await readNativeEditorSnapshot()).editingText === 'abcdef')
  await emitNativeMenuAction('edit.redo')
  await browser.waitUntil(async () => (await readNativeEditorSnapshot()).editingText === 'uvwxyz')
  assert.equal((await readNativeEditorSnapshot()).editingTextId, id)
})
