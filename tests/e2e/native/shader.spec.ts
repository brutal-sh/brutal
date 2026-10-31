import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { repoPath, testPath } from '#tests/helpers/paths'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

async function openNativeShaderFixture() {
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
  await (await $('[data-property="fills"][data-index="0"] button[aria-label="Fill"]')).click()
  await (await $('button[data-test-id="fill-picker-tab-shader"]')).click()
  return first
}

async function shaderPixels(id: string) {
  return browser.execute(async (nodeId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Native editor unavailable')
    const hash = store.graph.getNode(nodeId)?.fills?.[0]?.imageHash
    const bytes = hash && store.graph.images.get(hash)
    if (!bytes) return null
    const image = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
    try {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Cannot decode native shader pixels')
      context.drawImage(image, 0, 0)
      return [4, 56].map((x) => Array.from(context.getImageData(x, 4, 1, 1).data))
    } finally {
      image.close()
    }
  }, id)
}

describe('native GLSL source controls', () => {
  const server = createServer()
  let url = ''
  before(async () => {
    const source = await readFile(testPath('fixtures/shaders/checks.glsl'), 'utf8')
    server.on('request', (_request, response) => {
      response.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      })
      response.end(source)
    })
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('No native shader port')
    url = `http://127.0.0.1:${address.port}/checks.glsl`
  })
  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  it('loads GLSL through the real WebView, edits a uniform and clears/undoes its source', async () => {
    const first = await openNativeShaderFixture()
    const source = await $('input[aria-label="Shader path or URL"]')
    await source.setValue(url)
    await browser.keys('Enter')
    const size = await $('[role="spinbutton"][aria-label="Size"]')
    await size.waitForDisplayed()
    await size.click()
    const input = await $('input[role="spinbutton"][aria-label="Size"]')
    await input.waitForDisplayed()
    await input.setValue('24')
    await browser.keys('Enter')
    await browser.waitUntil(
      async () =>
        JSON.stringify(await shaderPixels(first)) === '[[255,255,255,255],[51,102,153,255]]',
      { timeoutMsg: 'Native GLSL pixels did not follow Size24' }
    )
    await browser.saveScreenshot(repoPath('local-evidence/native-shader-size-accepted.png'))
    await source.setValue('')
    await browser.keys('Enter')
    await browser.waitUntil(
      async () => JSON.stringify(await shaderPixels(first)) === '[[255,255,255,26],[0,0,0,26]]',
      { timeoutMsg: 'Native empty shader placeholder did not render' }
    )
    await browser.keys('Escape')
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'z'])
    await browser.waitUntil(
      async () =>
        JSON.stringify(await shaderPixels(first)) === '[[255,255,255,255],[51,102,153,255]]',
      { timeoutMsg: 'Native Undo did not restore the shader' }
    )
    assert.deepEqual(await shaderPixels(first), [
      [255, 255, 255, 255],
      [51, 102, 153, 255]
    ])
  })

  it('watches ordinary and atomic local writes, recovers diagnostics and preserves saved state', async () => {
    const first = await openNativeShaderFixture()
    const directory = await mkdtemp(join(tmpdir(), 'openpen-shader-native-'))
    const file = join(directory, 'watch.glsl')
    const blue = `precision mediump float;
/** @label Size
 * @default 32
 * @range 1, 64
 */
uniform float u_size;
void main(){ gl_FragColor=vec4(vec3(0.2,0.4,0.6)*step(u_size,gl_FragCoord.x),1.0); }`
    const black = [0, 0, 0, 255]
    const waitPixels = async (color: number[]) => {
      await browser.waitUntil(
        async () => JSON.stringify(await shaderPixels(first)) === JSON.stringify([black, color]),
        { timeoutMsg: 'Native watched shader did not produce its expected pixels' }
      )
    }
    try {
      await writeFile(file, blue)
      const source = await $('input[aria-label="Shader path or URL"]')
      await source.setValue(file)
      await browser.keys('Enter')
      const size = await $('[role="spinbutton"][aria-label="Size"]')
      await size.waitForDisplayed()
      await size.click()
      await (await $('input[role="spinbutton"][aria-label="Size"]')).setValue('24')
      await browser.keys('Enter')
      await waitPixels([51, 102, 153, 255])
      assert.equal(
        await browser.execute(
          async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
          join(directory, 'watch.pen')
        ),
        true
      )
      await writeFile(file, blue.replace('0.2,0.4,0.6', '0.4,0.6,0.2'))
      await waitPixels([102, 153, 51, 255])
      assert.equal(
        await browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges()),
        false
      )
      const replacement = join(directory, 'replacement.glsl')
      await writeFile(replacement, blue.replace('0.2,0.4,0.6', '0.6,0.2,0.4'))
      await rename(replacement, file)
      await waitPixels([153, 51, 102, 255])
      await writeFile(file, 'void main(){ gl_FragColor=invalid; }')
      await (await $('[role="alert"]')).waitForDisplayed()
      await browser.waitUntil(
        async () => JSON.stringify((await shaderPixels(first))?.[0]) === '[0,0,0,0]'
      )
      await writeFile(file, blue)
      await waitPixels([51, 102, 153, 255])
      assert.equal(
        await browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges()),
        false
      )
      await browser.keys('Escape')
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'z'])
      await waitPixels(black)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('reopens a saved document-local source with its override and continues watching it', async () => {
    const first = await openNativeShaderFixture()
    const directory = await mkdtemp(join(tmpdir(), 'openpen-shader-reopen-'))
    const savedPath = join(directory, 'reopen.pen')
    const file = join(directory, 'local.glsl')
    const source = `precision mediump float;
/** @label Strength
 * @default 0.4
 * @range 0, 1
 */
uniform float u_strength;
void main(){ gl_FragColor=vec4(u_strength,0.2,0.6,1.0); }`
    const save = () =>
      browser.execute(async (path) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Native editor unavailable')
        return store.saveFigFileToPath(path)
      }, savedPath)
    const color = [153, 51, 153, 255]
    try {
      await writeFile(file, source)
      assert.equal(await save(), true)
      const path = await $('input[aria-label="Shader path or URL"]')
      await path.setValue('local.glsl')
      await browser.keys('Enter')
      const strength = await $('[role="spinbutton"][aria-label="Strength"]')
      await strength.waitForDisplayed()
      await strength.click()
      await (await $('input[role="spinbutton"][aria-label="Strength"]')).setValue('0.6')
      await browser.keys('Enter')
      await browser.waitUntil(
        async () => JSON.stringify(await shaderPixels(first)) === JSON.stringify([color, color])
      )
      assert.equal(await save(), true)
      await browser.keys('Escape')
      const count = await $$('[data-test-id="tabbar-tab"]').length
      await (await $('[data-test-id="tabbar-close"][data-active]')).click()
      await browser.waitUntil(
        async () => (await $$('[data-test-id="tabbar-tab"]').length) === count - 1
      )
      await (await $('[role="tab"][aria-label="Home"]')).click()
      const recent = await $('//button[.//span[@data-slot="name" and contains(text(), "reopen")]]')
      await recent.waitForDisplayed()
      await recent.click()
      await browser.waitUntil(
        async () => (await $$('[data-test-id="tabbar-tab"]').length) === count
      )
      const reopened = await browser.execute(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Native editor unavailable')
        return store.graph
          .getChildren(store.state.currentPageId)
          .find((node) => node.name === 'Native Layer A')?.id
      })
      assert.ok(reopened, 'Saved shader layer did not reopen')
      await browser.waitUntil(
        async () => JSON.stringify(await shaderPixels(reopened)) === JSON.stringify([color, color])
      )
      await writeFile(file, source.replace('0.2,0.6,1.0', '0.8,0.6,1.0'))
      const changed = [153, 204, 153, 255]
      await browser.waitUntil(
        async () =>
          JSON.stringify(await shaderPixels(reopened)) === JSON.stringify([changed, changed])
      )
      assert.equal(
        await browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges()),
        false
      )
      await browser.saveScreenshot(repoPath('local-evidence/native-shader-reopen-accepted.png'))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
