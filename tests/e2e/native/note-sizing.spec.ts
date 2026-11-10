import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parsePenDocument } from '@open-pencil/pen'

import { testPath } from '#tests/helpers/paths'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { emitNativeMenuAction } from '#tests/helpers/tauri/invoke'

it('edits Note Fill dimensions and retains authored sizes through native Save/Recents reopening', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpen-note-fill-'))
  const path = join(directory, 'Native Note Fill.pen')
  try {
    await createNativeLayerFixture()
    const data = await readFile(testPath('fixtures/pen-note-fill.pen'), 'utf8')
    await browser.execute((data) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([data], 'Note Fill.pen', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
    }, data)
    const geometry = () =>
      browser.execute(() => {
        const store = window.openPencil?.getStore?.()
        return ['gold', 'purple', 'long'].map((id) => {
          const node = store?.graph.getNode(id)
          return { id, width: node?.width, height: node?.height }
        })
      })
    await browser.waitUntil(async () => (await geometry())[0].width === 560)
    assert.deepEqual(await geometry(), [
      { id: 'gold', width: 560, height: 219 },
      { id: 'purple', width: 560, height: 219 },
      { id: 'long', width: 250, height: 219 }
    ])
    await browser.execute(() => window.openPencil?.getStore?.().select(['gold']))
    const fillWidth = await $('[role="checkbox"][aria-label="Fill Width"]')
    const fillHeight = await $('[role="checkbox"][aria-label="Fill Height"]')
    await fillWidth.waitForDisplayed()
    assert.equal(await fillWidth.getAttribute('aria-checked'), 'true')
    await fillWidth.click()
    await emitNativeMenuAction('edit.undo')
    await browser.waitUntil(async () => (await fillWidth.getAttribute('aria-checked')) === 'true')
    await emitNativeMenuAction('edit.redo')
    await browser.waitUntil(async () => (await fillWidth.getAttribute('aria-checked')) === 'false')
    await fillHeight.click()
    await (await $('[role="spinbutton"][aria-label="Height"]')).click()
    const height = await $('input[role="spinbutton"][aria-label="Height"]')
    await height.waitForDisplayed()
    await height.setValue('450')
    await browser.keys('Enter')
    assert.equal((await geometry())[0].height, 219)
    assert.equal(
      await browser.execute(
        async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
        path
      ),
      true
    )
    const saved = parsePenDocument(await readFile(path, 'utf8'))
    assert.equal(saved.children[0].children?.[0].width, 560)
    assert.equal(saved.children[0].children?.[0].height, 450)
    assert.equal(saved.children[0].children?.[0].content, 'Fill sizing')
    assert.equal(saved.children[0].children?.[1].width, 'fill_container')
    assert.equal(saved.children[1].width, 'fill_container(200)')
    assert.equal(saved.children[1].height, 'fill_container(550)')
    const before = await geometry()
    await $('[data-test-id="tabbar-close"][data-active]').click()
    await $('[role="tab"][aria-label="Home"]').click()
    const recent = await $(
      '//button[.//span[@data-slot="name" and contains(text(), "Native Note Fill")]]'
    )
    await recent.waitForDisplayed()
    await recent.click()
    await browser.waitUntil(() =>
      browser.execute(
        (path) => window.openPencil?.getStore?.().getDocumentFilePath() === path,
        path
      )
    )
    assert.deepEqual(await geometry(), before)
    await browser.execute(() => window.openPencil?.getStore?.().select(['gold']))
    for (const axis of ['Width', 'Height']) {
      const checkbox = await $(`[role="checkbox"][aria-label="Fill ${axis}"]`)
      await checkbox.click()
      await (await $(`[role="spinbutton"][aria-label="${axis}"]`)).click()
      const input = await $(`input[role="spinbutton"][aria-label="${axis}"]`)
      await input.waitForDisplayed()
      await input.setValue('450')
      await browser.keys('Enter')
      assert.equal(await checkbox.getAttribute('aria-checked'), 'true')
    }
    assert.deepEqual(await geometry(), before)
    assert.equal(
      await browser.execute(
        async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
        path
      ),
      true
    )
    const retained = parsePenDocument(await readFile(path, 'utf8')).children[0].children?.[0]
    assert.equal(retained?.width, 'fill_container(450)')
    assert.equal(retained?.height, 'fill_container(450)')
    assert.equal(retained?.content, 'Fill sizing')
    const sizing = () =>
      browser.execute(() => {
        const node = window.openPencil?.getStore?.().graph.getNode('gold')
        return {
          pluginData: node?.pluginData,
          grow: node?.layoutGrow,
          align: node?.layoutAlignSelf
        }
      })
    const beforeReadOnly = await sizing()
    await browser.execute(() => {
      const store = window.openPencil?.getStore?.()
      store?.select(['gold'])
      store?.setReadOnly(true)
    })
    await $('[role="checkbox"][aria-label="Fill Width"]:disabled').waitForExist()
    await $('[role="checkbox"][aria-label="Fill Height"]:disabled').waitForExist()
    await $('[role="checkbox"][aria-label="Fill Width"]').click()
    await $('[role="checkbox"][aria-label="Fill Height"]').click()
    assert.deepEqual(await sizing(), beforeReadOnly)
    assert.equal(
      await $('[role="spinbutton"][aria-label="Height"]').getAttribute('aria-disabled'),
      'true'
    )
  } finally {
    await browser.execute(() => window.openPencil?.getStore?.().setReadOnly(false))
    await rm(directory, { recursive: true, force: true })
  }
})
