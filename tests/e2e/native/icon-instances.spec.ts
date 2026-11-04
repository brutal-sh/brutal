import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'

import { testPath } from '#tests/helpers/paths'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

it('opens nested icon variants with their own weights and distinct artwork', async () => {
  await createNativeLayerFixture()
  const data = await readFile(testPath('fixtures/pen-nested-icon-weight.pen'), 'utf8')
  await browser.execute((data) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([data], 'Nested icon weights.pen', { type: 'application/json' }))
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
  }, data)
  await browser.waitUntil(() =>
    browser.execute(() => {
      const editor = window.openPencil?.getStore?.()
      const glyph = editor?.graph.getChildren('instance')[0]
      return !!glyph && !!editor?.graph.getChildren(glyph.id).length
    })
  )
  const id = await browser.execute(
    () => window.openPencil?.getStore?.().graph.getChildren('instance')[0]?.id
  )
  assert.ok(id)
  await browser.execute((id) => {
    const editor = window.openPencil?.getStore?.()
    editor?.select([id])
    editor?.centerOn(210, 130, 2)
  }, id)
  const weight = await $('[data-property="icon-weight"]')
  await weight.waitForDisplayed()
  await weight.scrollIntoView()
  assert.ok((await weight.getText()).includes('700'))
  assert.equal(await $('[data-property="icon-family"]').getText(), 'Material Symbols Rounded')
  const drawing = (id: string) =>
    browser.execute(
      (id) =>
        window.openPencil
          ?.getStore?.()
          .graph.getChildren(id)
          .map(({ vectorNetwork }) => vectorNetwork),
      id
    )
  const bold = await drawing(id)
  assert.ok(bold?.some((network) => network?.vertices.length))
  await browser.execute(() => window.openPencil?.getStore?.().select(['glyph']))
  assert.ok((await weight.getText()).includes('200'))
  const thin = await drawing('glyph')
  assert.ok(thin?.some((network) => network?.vertices.length))
  assert.notDeepEqual(thin, bold)
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), id)
  assert.ok((await weight.getText()).includes('700'))
})
