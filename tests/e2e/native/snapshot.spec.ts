import { strict as assert } from 'node:assert'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

describe('native snapshot export', () => {
  it('previews a loaded local shader and cancels without changing the saved document', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'openpen-snapshot-native-'))
    const source = join(directory, 'checks.glsl')
    const documentPath = join(directory, 'Snapshot source.pen')
    try {
      await writeFile(
        source,
        `precision mediump float;
/** @label Size
 * @default 32
 * @range 1, 64
 */
uniform float u_size;
void main(){gl_FragColor=vec4(vec3(0.2,0.4,0.6)*step(u_size,gl_FragCoord.x),1.0);}`
      )
      const { first } = await createNativeLayerFixture()
      await browser.execute((id) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Native editor unavailable')
        store.graph.updateNode(id, {
          x: 440,
          y: 220,
          width: 320,
          height: 240,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }]
        })
        store.select([id])
        store.requestRender()
      }, first)
      await $('[data-property="fills"][data-index="0"] button[aria-label="Fill"]').click()
      await $('button[data-test-id="fill-picker-tab-shader"]').click()
      await $('input[aria-label="Shader path or URL"]').setValue(source)
      await browser.keys('Enter')
      await $('[role="spinbutton"][aria-label="Size"]').waitForDisplayed()
      await browser.keys('Escape')
      assert.equal(
        await browser.execute(
          async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
          documentPath
        ),
        true
      )
      await $('button[aria-label="Command palette"]').click()
      const search = await $('input[aria-label="Search commands"]')
      await search.setValue('Export Snapshot')
      await $('[role="option"]').waitForDisplayed()
      await browser.keys('ArrowDown')
      await browser.keys('Enter')
      const dialog = await $('[role="dialog"]')
      await dialog.waitForDisplayed()
      await dialog.$('summary').click()
      assert.ok((await dialog.$('li').getText()).includes('checks.glsl'))
      await dialog.$('button=Cancel').click()
      await dialog.waitForExist({ reverse: true })
      assert.deepEqual(
        await browser.execute(() => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Native editor unavailable')
          return { dirty: store.hasUnsavedChanges(), path: store.getDocumentFilePath() }
        }),
        { dirty: false, path: documentPath }
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
