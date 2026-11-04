import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { SkiaRenderer } from '@open-pencil/core/canvas'
import { parsePenDocument } from '@open-pencil/pen'
import { toolbarFlyoutItemTestId, toolbarFlyoutTestId } from '@open-pencil/vue/testing'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { emitNativeMenuAction } from '#tests/helpers/tauri/invoke'

const FILL_HEX = 'section[aria-label="Fill"] input[aria-label="Fill"]'

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
  assert.equal(await $('[data-property="icon-family"]').getText(), 'lucide')
  assert.equal(await $('[data-property="icon-weight"]').isExisting(), false)
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
  it('edits a Material glyph weight through the native inspector and restores its history', async () => {
    await createNativeLayerFixture()
    await browser.execute(() => {
      const data = JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'material',
            type: 'icon',
            library: 'Material Symbols Rounded',
            icon: 'home',
            width: 64,
            height: 64,
            weight: 200,
            fill: '#FFFFFF'
          }
        ]
      })
      const transfer = new DataTransfer()
      transfer.items.add(new File([data], 'Material weight.pen', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
    })
    await browser.waitUntil(() =>
      browser.execute(
        () => !!window.openPencil?.getStore?.().graph.getNode('material')?.childIds?.length
      )
    )
    await browser.execute(() => {
      const editor = window.openPencil?.getStore?.()
      editor?.select(['material'])
      editor?.centerOn(32, 32, 2)
    })
    const drawing = () =>
      browser.execute(() => {
        const editor = window.openPencil?.getStore?.()
        if (!editor) throw new Error('Native editor unavailable')
        return editor.graph
          .getChildren('material')
          .map(({ id, vectorNetwork }) => ({ id, vectorNetwork }))
      })
    const original = await drawing()
    assert.ok(original.length)
    const family = await $('[data-property="icon-family"]')
    assert.equal(await family.getText(), 'Material Symbols Rounded')
    const weight = await $('[data-property="icon-weight"]')
    await weight.scrollIntoView()
    await browser.execute(() => {
      document.querySelector<HTMLElement>('[data-property="icon-weight"]')?.focus()
    })
    const input = '[data-property="icon-weight"] input'
    await $(input).waitForDisplayed()
    // Exercise the WebView's input path; trusted OS keyboard replacement is separate acceptance.
    const typeWeight = async (value: string) =>
      browser.execute(
        (selector, value) => {
          const input = document.querySelector<HTMLInputElement>(selector)
          if (!input) throw new Error('Native weight input missing')
          input.value = value
          input.dispatchEvent(new Event('input', { bubbles: true }))
        },
        input,
        value
      )
    await typeWeight('400')
    await browser.waitUntil(
      async () => JSON.stringify(await drawing()) !== JSON.stringify(original)
    )
    await typeWeight('700')
    await browser.execute((selector) => {
      document.querySelector(selector)?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true
        })
      )
    }, input)
    await browser.waitUntil(async () => !(await $(input).isExisting()))
    await browser.waitUntil(async () => (await weight.getText()).includes('700'))
    const changed = await drawing()
    assert.deepEqual(
      changed.map(({ id }) => id),
      original.map(({ id }) => id)
    )
    assert.notDeepEqual(changed, original)
    await emitNativeMenuAction('edit.undo')
    await browser.waitUntil(async () => (await weight.getText()).includes('200'))
    assert.deepEqual(await drawing(), original)
    await emitNativeMenuAction('edit.redo')
    await browser.waitUntil(async () => (await weight.getText()).includes('700'))
    assert.deepEqual(await drawing(), changed)
  })

  it('opens dropped icons in the native WebView and draws alpha and disabled paints', async () => {
    await createNativeLayerFixture()
    await browser.execute(() => {
      const data = JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'sheet',
            type: 'frame',
            layout: 'none',
            width: 420,
            height: 160,
            fill: '#18181B',
            children: [
              '#FFFFFF',
              '#FFFFFF80',
              { type: 'color', color: '#FFFFFF', enabled: false }
            ].map((fill, index) => ({
              id: `icon-${index}`,
              type: 'icon',
              library: 'lucide',
              icon: 'heart',
              x: 20 + index * 100,
              y: 40,
              width: 64,
              height: 64,
              fill
            }))
          }
        ]
      })
      const transfer = new DataTransfer()
      transfer.items.add(new File([data], 'Painted icons.pen', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
    })
    await browser.waitUntil(() =>
      browser.execute(
        () => !!window.openPencil?.getStore?.().graph.getNode('icon-0')?.childIds?.length
      )
    )
    const pixels = await browser.execute(() => {
      const current = window.openPencil?.getStore?.()
      if (!current) throw new Error('Opened editor unavailable')
      current.clearSelection()
      current.centerOn(210, 80, 1)
      const renderer = current.canvasRenderers.find(
        (candidate: SkiaRenderer) => candidate.tracksSceneSettlement
      )
      const source = [
        ...document.querySelectorAll<HTMLCanvasElement>('[data-test-id="scene-canvas-element"]')
      ].find((canvas) => canvas.getClientRects().length > 0)
      if (!renderer || !source) throw new Error('Native scene renderer unavailable')
      const copy = document.createElement('canvas')
      copy.width = source.width
      copy.height = source.height
      const context = copy.getContext('2d', { colorSpace: 'srgb' })
      if (!context) throw new Error('Native sRGB context unavailable')
      renderer.renderFromEditorState(
        current.state,
        current.graph,
        current.textEditor,
        renderer.viewportWidth,
        renderer.viewportHeight,
        false,
        'scene',
        true
      )
      context.drawImage(source, 0, 0)
      // Lucide heart's left lobe crosses (2, 9.5) in its 24px source square.
      const values = [0, 1, 2].map((index) =>
        Array.from(
          context.getImageData(
            Math.floor((current.state.panX + 20 + index * 100 + 16 / 3) * devicePixelRatio),
            Math.floor((current.state.panY + 40 + 76 / 3) * devicePixelRatio),
            1,
            1
          ).data
        )
      )
      current.select(['icon-0'])
      current.requestRepaint()
      return values
    })
    assert.deepEqual(pixels[0], [255, 255, 255, 255])
    assert.deepEqual(pixels[1], [140, 140, 141, 255])
    assert.deepEqual(pixels[2], [24, 24, 27, 255])
    await $('[data-property="icon-name"]').waitForDisplayed()
    assert.ok((await $('[data-property="icon-name"]').getText()).includes('heart'))
  })

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
      const color = await $(FILL_HEX)
      // The embedded driver's replacement appends after Vue restores the cleared field.
      // Exercise the change handler here; physical keyboard replacement remains a separate check.
      await browser.execute((selector) => {
        const input = document.querySelector<HTMLInputElement>(selector)
        if (!input) throw new Error('Native icon color input missing')
        input.value = '1288AA'
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }, FILL_HEX)
      assert.equal((await color.getValue()).toUpperCase(), '1288AA', 'Hex edit did not commit')
      await browser.waitUntil(() =>
        browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges() === true)
      )
      await emitNativeMenuAction('save')
      await browser.waitUntil(() =>
        browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges() === false)
      )
      const saved = await readFile(path, 'utf8')
      assert.deepEqual(parsePenDocument(saved).children[0].fill, [
        { type: 'color', color: '#1288AA', enabled: true }
      ])
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
      const reopenedColor = await $(FILL_HEX)
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
