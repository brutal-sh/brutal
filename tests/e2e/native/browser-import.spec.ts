import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { repoPath } from '#tests/helpers/paths'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let imageServer: Server
let origin: string
let mainHandle: string
const requests: string[] = []
type ImportResult = {
  error?: string
  rootId?: string
  textId?: string
  imageBytes?: number
  rejectedWithoutChange?: boolean
  childCount?: number
  sourcePNG?: number[]
}

describe('native editable browser import', () => {
  before(async function () {
    if (process.platform !== 'darwin') this.skip()
    const font = await readFile(repoPath('packages/core/assets/InterVariable.ttf'))
    const image = await readFile(repoPath('tests/fixtures/vectorize/python_logo.png'))
    imageServer = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'image/png' })
      response.end(image)
    })
    await new Promise<void>((resolve) => {
      imageServer.listen(0, '127.0.0.1', resolve)
    })
    const imageAddress = imageServer.address()
    if (!imageAddress || typeof imageAddress === 'string') throw new Error('Missing image address')
    const crossImage = `http://127.0.0.1:${imageAddress.port}/image.png`
    server = createServer((request, response) => {
      requests.push(request.url ?? '')
      if (request.url === '/image.png') {
        response.writeHead(200, { 'Content-Type': 'image/png' })
        response.end(image)
        return
      }
      if (request.url === '/font.ttf') {
        response.writeHead(200, { 'Content-Type': 'font/ttf' })
        response.end(font)
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(`<!doctype html><title>Editable browser fixture</title><style>
      @font-face{font-family:Inter;src:url('/font.ttf')}*{box-sizing:border-box}html,body{margin:0;font-family:Inter;background:#fff;color:#111}body{padding:24px}section{display:flex;gap:20px;padding:16px;background:#cde;border-radius:12px;height:180px}h1{font-size:24px;font-weight:400;margin:0}p{font-size:16px;margin:12px 0}img{width:80px;height:80px;object-fit:contain}
      </style><section><div><h1>Editable heading</h1><p>Real browser text</p></div><img alt="Fixture" src="${request.url === '/cross-image' ? crossImage : '/image.png'}"></section>${request.url === '/unsupported' ? '<iframe src="/frame" width="100" height="50"></iframe>' : ''}`)
    })
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing fixture address')
    origin = `http://127.0.0.1:${address.port}`
    mainHandle = await browser.getWindowHandle()
    await createNativeLayerFixture()
  })
  after(async () => {
    await browser.switchToWindow(mainHandle)
    await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
    server?.close()
    imageServer?.close()
  })

  it('imports loaded text and image pixels into editable layers and refuses unsupported content atomically', async () => {
    const holdForInspection = process.env.OPENPENCIL_BROWSER_IMPORT_HOLD === '1'
    if (holdForInspection) await browser.setTimeout({ script: 60000 })
    const result = await browser.executeAsync<ImportResult, [string, boolean]>(
      async (origin, hold, done) => {
        const invoke = window.__TAURI__?.core.invoke
        if (!invoke) return done({ error: 'Missing native bridge' })
        const wait = async (condition: () => boolean | Promise<boolean>, label: string) => {
          const end = Date.now() + 15000
          while (Date.now() < end) {
            if (await condition()) return
            await new Promise((resolve) => {
              setTimeout(resolve, 40)
            })
          }
          throw new Error(
            `Timed out ${label}: ${document.querySelector('[role="alert"]')?.textContent ?? ''}`
          )
        }
        const button = (label: string) => {
          const element = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
          if (!element || element.disabled) throw new Error(`Unavailable ${label}`)
          element.click()
        }
        const navigate = async (path: string) => {
          button('Web address')
          await wait(() => !!document.querySelector('input[type="url"]'), 'address popup')
          const input = document.querySelector<HTMLInputElement>('input[type="url"]')
          if (!input) throw new Error('Missing address')
          input.value = origin + path
          input.dispatchEvent(new Event('input', { bubbles: true }))
          await new Promise((resolve) => {
            setTimeout(resolve, 40)
          })
          input
            .closest('form')
            ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
          await wait(
            async () =>
              (await invoke<{ url: string } | null>('browser_preview_status'))?.url ===
              origin + path,
            'navigate'
          )
          await new Promise((resolve) => {
            setTimeout(resolve, 1000)
          })
        }
        try {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Missing design')
          const pageId = store.state.currentPageId
          const initial = store.graph.getChildren(pageId).length
          button('Browser preview')
          await wait(
            () => !!document.querySelector('[data-test-id="browser-preview-surface"]'),
            'dock'
          )
          await navigate('/page')
          if (hold)
            await new Promise((resolve) => {
              setTimeout(resolve, 25000)
            })
          const sourcePNG = Array.from(
            new Uint8Array(
              await invoke<ArrayBuffer>('browser_preview_capture', { url: origin + '/page' })
            )
          )
          button('Import editable page')
          await wait(() => store.graph.getChildren(pageId).length > initial, 'editable import')
          const rootId = [...store.state.selectedIds][0]
          const descendants = (id: string): ReturnType<typeof store.graph.getChildren> =>
            store.graph.getChildren(id).flatMap((node) => [node, ...descendants(node.id)])
          const nodes = descendants(rootId)
          const text = nodes.find(
            (node) => node.type === 'TEXT' && node.text === 'Editable heading'
          )
          const image = nodes.find((node) => node.fills?.some((fill) => fill.type === 'IMAGE'))
          if (!text || !image)
            throw new Error(
              `Missing editable content: ${JSON.stringify(nodes.map((n) => [n.type, n.text]))}`
            )
          const hash = image.fills?.find((fill) => fill.type === 'IMAGE')?.imageHash
          const imageBytes = hash ? store.graph.images.get(hash)?.byteLength : 0
          const before = store.graph
            .getChildren(pageId)
            .map((node) => node.id)
            .join(',')
          const selected = [...store.state.selectedIds].join(',')
          await navigate('/cross-image')
          button('Import editable page')
          await wait(
            () =>
              document.querySelector('[role="alert"]')?.textContent?.includes('cross-origin') ??
              false,
            'unreadable cross-origin image diagnostic'
          )
          if (
            before !==
            store.graph
              .getChildren(pageId)
              .map((node) => node.id)
              .join(',')
          )
            throw new Error('Cross-origin image refusal changed the design')
          await navigate('/unsupported')
          button('Import editable page')
          await wait(
            () =>
              document.querySelector('[role="alert"]')?.textContent?.includes('iframe') ?? false,
            'unsupported diagnostic'
          )
          const rejectedWithoutChange =
            before ===
              store.graph
                .getChildren(pageId)
                .map((node) => node.id)
                .join(',') &&
            selected === [...store.state.selectedIds].join(',') &&
            pageId === store.state.currentPageId
          button('Close browser preview')
          await wait(async () => (await invoke('browser_preview_status')) === null, 'close preview')
          done({
            rootId,
            textId: text.id,
            imageBytes,
            childCount: nodes.length,
            rejectedWithoutChange,
            sourcePNG
          })
        } catch (error) {
          await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
          done({ error: String(error) })
        }
      },
      origin,
      holdForInspection
    )
    assert.ok(!result.error, result.error)
    const { rootId, textId } = result
    assert.ok(rootId && textId)
    assert.ok(result.imageBytes && result.imageBytes > 8)
    assert.ok(result.childCount && result.childCount > 4)
    assert.equal(result.rejectedWithoutChange, true)
    if (result.sourcePNG)
      await writeFile(
        'local-evidence/native-browser-import-source.png',
        new Uint8Array(result.sourcePNG)
      )
    console.debug(
      'Editable native import evidence:',
      JSON.stringify({ ...result, sourcePNG: result.sourcePNG?.length })
    )
    await browser.keys(['Shift', '2'])
    await browser.execute(() => window.openPencil?.getStore?.()?.select([]))
    await browser.saveScreenshot('local-evidence/native-browser-import-layers.png')
    await browser.keys(['Meta', 'z'])
    await browser.waitUntil(async () =>
      browser.execute((id) => !window.openPencil?.getStore?.()?.graph.getNode(id), rootId)
    )
    await browser.keys(['Meta', 'Shift', 'z'])
    await browser.waitUntil(async () =>
      browser.execute((id) => !!window.openPencil?.getStore?.()?.graph.getNode(id), rootId)
    )
    await browser.execute((id) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing editor')
      store.select([id])
      store.startTextEditing(id)
      store.textEditor?.selectAll()
    }, textId)
    await browser.keys('Edited after browser import')
    await browser.keys('Escape')
    assert.equal(
      await browser.execute(
        (id) => window.openPencil?.getStore?.()?.graph.getNode(id)?.text,
        textId
      ),
      'Edited after browser import'
    )
    assert.ok(requests.includes('/font.ttf'))
    const directory = await mkdtemp(join(tmpdir(), 'openpen-browser-import-'))
    try {
      const filePath = join(directory, 'Imported.fig')
      const saved = await browser.executeAsync<boolean, [string]>(async (path, done) => {
        try {
          done((await window.openPencil?.getStore?.()?.saveFigFileToPath(path)) ?? false)
        } catch {
          done(false)
        }
      }, filePath)
      assert.equal(saved, true)
      const data = Array.from(await readFile(filePath))
      await writeFile('local-evidence/native-browser-import.fig', new Uint8Array(data))
      const reopened = await browser.executeAsync<
        { text?: string; imageCount?: number; error?: string },
        [number[]]
      >(async (data, done) => {
        try {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Missing editor')
          await store.openFigFile(new File([new Uint8Array(data)], 'Reopened.fig'))
          const descendants = (id: string): ReturnType<typeof store.graph.getChildren> =>
            store.graph.getChildren(id).flatMap((node) => [node, ...descendants(node.id)])
          const nodes = descendants(store.state.currentPageId)
          done({
            text: nodes.find(
              (node) => node.type === 'TEXT' && node.text === 'Edited after browser import'
            )?.text,
            imageCount: store.graph.images.size
          })
        } catch (error) {
          done({ error: String(error) })
        }
      }, data)
      assert.ok(!reopened.error, reopened.error)
      assert.equal(reopened.text, 'Edited after browser import')
      assert.ok(reopened.imageCount && reopened.imageCount > 0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
