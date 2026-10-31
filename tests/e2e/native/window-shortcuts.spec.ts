import { strict as assert } from 'node:assert'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'

async function selectDocument(digit: string, name: string) {
  await browser.keys([modifier, digit])
  await browser.waitUntil(async () =>
    browser.execute(
      (expected) => window.openPencil?.getStore?.().state.documentName === expected,
      name
    )
  )
  assert.equal(await browser.execute(() => window.openPencil?.getStore?.().state.zoom), 1.25)
}

it('selects desktop documents by number while retaining zoom, Home and input state', async () => {
  let secondLayer = ''
  for (const name of ['Shortcut A', 'Shortcut B', 'Shortcut C']) {
    if (name !== 'Shortcut A') await $('button[aria-label="New design"]').click()
    const fixture = await createNativeLayerFixture()
    if (name === 'Shortcut B') secondLayer = fixture.first
    await browser.execute(
      ({ name, ids }) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Native editor unavailable')
        store.state.documentName = name
        for (const [index, id] of ids.entries()) {
          store.graph.updateNode(id, { x: index * 1200, y: 0, width: 100, height: 100 })
        }
        store.select([ids[0]])
        store.zoomToLevel(1.25)
      },
      { name, ids: [fixture.first, fixture.second, fixture.third] }
    )
  }
  await selectDocument('1', 'Shortcut A')
  await browser.keys([modifier, '8'])
  assert.equal(
    await browser.execute(() => window.openPencil?.getStore?.().state.documentName),
    'Shortcut A'
  )
  await selectDocument('9', 'Shortcut C')
  await $('[role="tab"][aria-label="Home"]').click()
  await selectDocument('2', 'Shortcut B')
  await $('input[aria-label="Layer name"]').click()
  await selectDocument('1', 'Shortcut A')
  await selectDocument('2', 'Shortcut B')
  assert.deepEqual(
    await browser.execute((id) => {
      const store = window.openPencil?.getStore?.()
      return {
        name: store?.graph.getNode(id)?.name,
        selected: [...(store?.state.selectedIds ?? [])]
      }
    }, secondLayer),
    { name: 'Native Layer A', selected: [secondLayer] }
  )
  await $('canvas').click()
  await browser.keys(['Shift', '1'])
  const fitZoom = await browser.execute(() => window.openPencil?.getStore?.().state.zoom)
  assert.ok(typeof fitZoom === 'number' && fitZoom < 1.25)
  await browser.keys(['Shift', '2'])
  const selectionZoom = await browser.execute(() => window.openPencil?.getStore?.().state.zoom)
  assert.ok(typeof selectionZoom === 'number' && selectionZoom > fitZoom)
})
