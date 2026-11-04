import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parsePenDocument } from '@open-pencil/pen'
import { toolbarFlyoutItemTestId, toolbarFlyoutTestId } from '@open-pencil/vue/testing'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { emitNativeMenuAction } from '#tests/helpers/tauri/invoke'

async function checkIconControls() {
  const sections = await browser.execute(() =>
    [...document.querySelectorAll('section[aria-label]')]
      .map((section) => section.getAttribute('aria-label'))
      .filter((label) =>
        [
          'Alignment',
          'Position',
          'Layout',
          'Appearance',
          'Fill',
          'Icon',
          'Stroke',
          'Effects'
        ].includes(label ?? '')
      )
  )
  assert.deepEqual(sections, [
    'Alignment',
    'Position',
    'Layout',
    'Appearance',
    'Fill',
    'Icon',
    'Effects'
  ])
  assert.equal(await $('[aria-label="Flow"]').isExisting(), false)
  assert.equal(await $('[data-test-id="clip-content-checkbox"]').isExisting(), false)
  await $('[data-test-id="toolbar-flyout-rectangle"]').click()
  await browser.waitUntil(() =>
    browser.execute(
      (expected) => document.activeElement?.getAttribute('data-test-id') === expected,
      toolbarFlyoutItemTestId('RECTANGLE')
    )
  )
  assert.equal(
    await $('[data-test-id="toolbar-flyout-item-icon"]').getAttribute('aria-checked'),
    'true'
  )
  await browser.keys('ArrowDown')
  await browser.waitUntil(() =>
    browser.execute(
      (expected) => document.activeElement?.getAttribute('data-test-id') === expected,
      toolbarFlyoutItemTestId('ELLIPSE')
    )
  )
  await browser.keys('Escape')
  await browser.waitUntil(() =>
    browser.execute(() => document.querySelectorAll('[role="menu"]').length === 0)
  )
  assert.equal(
    await browser.execute(() => document.activeElement?.getAttribute('data-test-id')),
    toolbarFlyoutTestId('RECTANGLE')
  )
}

describe('native editable icon persistence', () => {
  it('places a heart, saves its changed color and reopens the editable icon from Recents', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'openpen-icon-reopen-'))
    const path = join(directory, 'Editable heart.pen')
    try {
      await createNativeLayerFixture()
      await browser.execute(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Native editor unavailable')
        for (const node of store.graph.getChildren(store.state.currentPageId))
          store.graph.deleteNode(node.id)
      })
      await $('[data-test-id="toolbar-flyout-rectangle"]').click()
      await $('[data-test-id="toolbar-flyout-item-icon"]').click()
      await $('canvas').click({ x: 15, y: 15 })
      const name = await $('[data-property="icon-name"]')
      await name.waitForDisplayed()
      assert.ok((await name.getText()).includes('heart'))
      const id = await browser.execute(
        () => [...(window.openPencil?.getStore?.().state.selectedIds ?? [])][0]
      )
      assert.ok(id, 'Placed icon was not selected')
      await checkIconControls()
      // Path setup bypasses the OS picker; the subsequent Save event and Recents controls are exercised.
      assert.equal(
        await browser.execute(
          async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
          path
        ),
        true
      )
      const color = await $('[data-property="icon-color"] [data-test-id="color-hex-input"]')
      // The embedded driver's replacement appends after Vue restores the cleared field.
      // Exercise the change handler here; physical keyboard replacement remains a separate check.
      await browser.execute(() => {
        const input = document.querySelector<HTMLInputElement>(
          '[data-property="icon-color"] [data-test-id="color-hex-input"]'
        )
        if (!input) throw new Error('Native icon color input missing')
        input.value = '1288AA'
        input.dispatchEvent(new Event('change', { bubbles: true }))
      })
      assert.equal((await color.getValue()).toUpperCase(), '1288AA', 'Hex edit did not commit')
      await browser.waitUntil(() =>
        browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges() === true)
      )
      await emitNativeMenuAction('save')
      await browser.waitUntil(async () => {
        const icon = parsePenDocument(await readFile(path, 'utf8')).children[0]
        return icon.fill === '#1288AA'
      })
      const saved = await readFile(path, 'utf8')
      assert.deepEqual(
        parsePenDocument(saved).children.map((node) => ({
          id: node.id,
          type: node.type,
          library: node.library,
          icon: node.icon,
          width: node.width,
          height: node.height
        })),
        [{ id, type: 'icon', library: 'lucide', icon: 'heart', width: 24, height: 24 }]
      )
      assert.equal(parsePenDocument(saved).children[0].children, undefined)
      await $('[data-test-id="tabbar-close"][data-active]').click()
      await $('[role="tab"][aria-label="Home"]').click()
      const recent = await $(
        '//button[.//span[@data-slot="name" and contains(text(), "Editable heart")]]'
      )
      await recent.waitForDisplayed()
      await recent.click()
      await browser.waitUntil(() =>
        browser.execute(
          (path) => window.openPencil?.getStore?.().getDocumentFilePath() === path,
          path
        )
      )
      await browser.waitUntil(
        () =>
          browser.execute(
            (id) => !!window.openPencil?.getStore?.().graph.getNode(id)?.childIds?.length,
            id
          ),
        { timeoutMsg: 'Reopened icon artwork did not load' }
      )
      await browser.execute((id) => window.openPencil?.getStore?.().select([id]), id)
      const reopenedName = await $('[data-property="icon-name"]')
      await reopenedName.waitForDisplayed()
      assert.ok((await reopenedName.getText()).includes('heart'))
      const reopenedColor = await $('[data-property="icon-color"] [data-test-id="color-hex-input"]')
      assert.equal((await reopenedColor.getValue()).toUpperCase(), '1288AA')
      assert.equal(
        await browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges()),
        false
      )
      assert.equal(await readFile(path, 'utf8'), saved)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
