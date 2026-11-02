import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import type { Rect } from '@open-pencil/scene-graph/primitives'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let origin: string
let mainHandle: string
const ipcReports: string[] = []
type EmbeddedResult =
  | { error: string }
  | {
      id: string
      pixel: number[]
      width: number
      height: number
      current: {
        url: string
        x: number
        y: number
        width: number
        height: number
        windowLabel: string
      }
      rect: Rect
      layerWidth?: number
      layerHeight?: number
      bytes?: number
    }

describe('native embedded browser preview', () => {
  before(async () => {
    server = createServer((request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*')
      if (request.url === '/reports') {
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(ipcReports))
        return
      }
      if (request.url?.startsWith('/report?')) {
        ipcReports.push(request.url)
        response.end('ok')
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(
        // oxlint-disable-next-line open-pencil/no-hand-rolled-color -- Exact pixels are the native snapshot acceptance contract.
        `<!doctype html><title>Preview fixture</title><style>html,body{margin:0;width:100%;height:100%;background:rgb(238,51,68)}@media(max-width:500px){html,body{background:rgb(34,170,85)}}</style><a href="/second">Next page</a><script>(async()=>{const invoke=window.__TAURI__?.core?.invoke; const commands=[['browser_preview_status',{}],['plugin:os|platform',{}],['plugin:fs|exists',{path:'/tmp/openpen-no-access-fixture'}]]; const blocked=await Promise.all(commands.map(async([command,args])=>{if(!invoke)return true;try{await invoke(command,args);return false}catch{return true}}));await fetch('/report?blocked='+blocked.join(',')+'&page='+encodeURIComponent(location.pathname));})();</script>`
      )
    })
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing fixture server address')
    origin = `http://127.0.0.1:${address.port}`
    mainHandle = await browser.getWindowHandle()
    await browser.switchToWindow(mainHandle)
    const fixture = await createNativeLayerFixture()
    await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
  })

  after(async () => {
    await browser.switchToWindow(mainHandle)
    await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
    server?.close()
  })

  it('toggles the browser from the selected-layer inspector without editing the document', async () => {
    const before = await browser.execute(() => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('No editor')
      return { version: store.state.sceneVersion, selected: [...store.state.selectedIds] }
    })
    const entry = await $('button=Import Web via Browser')
    await entry.waitForDisplayed()
    await entry.click()
    await $('[data-test-id="browser-preview-dock"]').waitForDisplayed()
    await entry.click()
    await $('[data-test-id="browser-preview-dock"]').waitForExist({ reverse: true })
    assert.deepEqual(
      await browser.execute(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('No editor')
        return { version: store.state.sceneVersion, selected: [...store.state.selectedIds] }
      }),
      before
    )
  })

  it('preserves the sidebar and canvas while expanding and reopening the browser', async () => {
    const result = await browser.executeAsync<{ failure?: string }, []>(async (done) => {
      const button = (label: string) => {
        const element = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!element) throw new Error(`Missing ${label}`)
        element.click()
      }
      const wait = async (condition: () => boolean, label: string) => {
        const deadline = Date.now() + 12000
        while (Date.now() < deadline) {
          if (condition()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
        }
        throw new Error(`Timed out: ${label}`)
      }
      const dock = () =>
        document.querySelector<HTMLElement>('[data-test-id="browser-preview-dock"]')
      const sidebar = document.querySelector('[aria-label="Workspace sidebar"]')
      const canvas = document.querySelector('canvas')
      const store = window.openPencil?.getStore?.()
      if (!sidebar || !canvas || !store) return done({ failure: 'Missing editor surfaces' })
      const renderer = store.renderer
      const width = sidebar.getBoundingClientRect().width
      const before = { version: store.state.sceneVersion, selected: [...store.state.selectedIds] }
      try {
        button('Import Web via Browser')
        await wait(() => !!dock(), 'split browser')
        await wait(
          () => Math.abs(sidebar.getBoundingClientRect().width - width) < 1,
          'stable sidebar'
        )
        button('Coding Mode')
        await wait(
          () => !!document.querySelector('button[aria-label="Exit Coding Mode"]'),
          'expanded browser'
        )
        await wait(() => {
          const surface = document
            .querySelector('[data-slot="canvas-split-root"]')
            ?.getBoundingClientRect()
          const browser = dock()?.getBoundingClientRect()
          return (
            !!surface &&
            !!browser &&
            Math.abs(browser.left - surface.left - 8) < 1 &&
            Math.abs(browser.right - surface.right) < 1 &&
            Math.abs(browser.top - surface.top - 50) < 1
          )
        }, 'browser over canvas')
        if (getComputedStyle(canvas).visibility !== 'hidden')
          throw new Error('Canvas stays visible in Coding Mode')
        button('Close browser preview')
        await wait(() => !dock(), 'closed browser')
        if (getComputedStyle(canvas).visibility === 'hidden')
          throw new Error('Canvas stays hidden after closing')
        button('Import Web via Browser')
        await wait(
          () => !!document.querySelector('button[aria-label="Exit Coding Mode"]'),
          'retained mode'
        )
        button('Exit Coding Mode')
        await wait(
          () => !!document.querySelector('button[aria-label="Coding Mode"]'),
          'split mode restored'
        )
        await wait(
          () => Math.abs(sidebar.getBoundingClientRect().width - width) < 1,
          'restored sidebar'
        )
        if (store.renderer !== renderer || document.querySelector('canvas') !== canvas)
          throw new Error('Mode replaces the canvas renderer')
        if (
          store.state.sceneVersion !== before.version ||
          [...store.state.selectedIds].join(',') !== before.selected.join(',')
        )
          throw new Error('Mode changes the document')
        done({})
      } catch (error) {
        done({ failure: String(error) })
      } finally {
        document.querySelector<HTMLButtonElement>('button[aria-label="Exit Coding Mode"]')?.click()
        document
          .querySelector<HTMLButtonElement>('button[aria-label="Close browser preview"]')
          ?.click()
      }
    })
    assert.equal(result.failure, undefined, result.failure)
  })

  it('keeps canvas edit keys out of the focused browser toolbar', async () => {
    const snapshot = () =>
      browser.execute(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('No editor')
        return {
          version: store.state.sceneVersion,
          selected: [...store.state.selectedIds],
          tool: store.state.activeTool,
          layers: store.graph
            .getChildren(store.state.currentPageId)
            .map(({ id, x, y }) => ({ id, x, y }))
        }
      })
    const before = await snapshot()
    await $('button=Import Web via Browser').click()
    try {
      const desktop = await $('button[aria-label="Desktop"]')
      await desktop.waitForDisplayed()
      await desktop.execute((button) => button.focus())
      await browser.keys('ArrowRight')
      await browser.keys('Delete')
      await browser.keys('r')
      assert.deepEqual(await snapshot(), before)
    } finally {
      await $('button[aria-label="Close browser preview"]').click()
    }
    await browser.execute(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await browser.keys('Delete')
    await browser.waitUntil(
      async () => (await snapshot()).layers.length === before.layers.length - 1
    )
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', 'z'])
    await browser.waitUntil(async () => (await snapshot()).layers.length === before.layers.length)
  })

  it('embeds responsive pixels, denies remote IPC, captures to a layer, and undoes it', async function () {
    if (process.platform !== 'darwin') this.skip()
    // The test driver only resolves standalone windows. Keep its existing main executor while
    // exercising the child, then close it before returning. No production test bridge is added.
    const result = await browser.executeAsync<EmbeddedResult, [string]>(async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      if (!invoke) return done({ error: 'Missing native invoke' })
      const wait = async (condition: () => boolean | Promise<boolean>, label: string) => {
        const end = Date.now() + 12000
        while (Date.now() < end) {
          if (await condition()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
        }
        throw new Error(`Timed out: ${label}`)
      }
      const button = (label: string) => {
        const target = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!target || target.disabled) throw new Error(`Unavailable button: ${label}`)
        target.click()
      }
      const navigate = async (url: string) => {
        button('Web address')
        await wait(() => !!document.querySelector('input[type="url"]'), 'address popover')
        const input = document.querySelector<HTMLInputElement>('input[type="url"]')
        if (!input) throw new Error('Missing address field')
        input.value = url
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
        input
          .closest('form')
          ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        await wait(
          async () => (await invoke<{ url: string } | null>('browser_preview_status'))?.url === url,
          'navigation'
        )
        await wait(() => !input.disabled, 'navigation settled')
      }
      try {
        button('Import Web via Browser')
        await wait(
          () => !!document.querySelector('[data-test-id="browser-preview-surface"]'),
          'dock mounted'
        )
        await navigate(`${origin}/first`)
        // URL changes precede document commit in WKWebView; wait for fixture execution so
        // the next navigation creates a real history entry rather than replacing its load.
        await wait(async () => {
          const reports: unknown = await (await fetch(`${origin}/reports`)).json()
          return (
            Array.isArray(reports) &&
            reports.some(
              (report: unknown) => typeof report === 'string' && report.includes('page=%2Ffirst')
            )
          )
        }, 'first page committed')
        await navigate(`${origin}/second`)
        const modeStore = window.openPencil?.getStore?.()
        const modeRenderer = modeStore?.renderer
        const modeCanvas = document.querySelector('canvas')
        button('Coding Mode')
        await wait(
          () => !!document.querySelector('button[aria-label="Exit Coding Mode"]'),
          'Coding Mode'
        )
        button('Exit Coding Mode')
        await wait(() => !!document.querySelector('button[aria-label="Coding Mode"]'), 'split mode')
        if (modeStore?.renderer !== modeRenderer || document.querySelector('canvas') !== modeCanvas)
          throw new Error('Browser mode replaces the canvas renderer')
        button('Back')
        await wait(
          async () =>
            (await invoke<{ url: string }>('browser_preview_status')).url.endsWith('/first'),
          'back'
        )
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        button('Forward')
        await wait(
          async () =>
            (await invoke<{ url: string }>('browser_preview_status')).url.endsWith('/second'),
          'forward'
        )
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        button('Phone')
        const surface = document.querySelector<HTMLElement>(
          '[data-test-id="browser-preview-surface"]'
        )
        if (!surface) throw new Error('Missing native surface host')
        const rect = surface.getBoundingClientRect()
        const expectedWidth = Math.min(390, Math.floor(rect.width))
        await wait(
          async () =>
            (await invoke<{ width: number }>('browser_preview_status')).width === expectedWidth,
          'phone bounds'
        )
        surface.style.maxWidth = '280px'
        await wait(
          async () => (await invoke<{ width: number }>('browser_preview_status')).width === 280,
          'dock resized'
        )
        surface.style.maxWidth = ''
        await wait(
          async () =>
            (await invoke<{ width: number }>('browser_preview_status')).width === expectedWidth,
          'dock restored'
        )
        button('Reload page')
        await new Promise((resolve) => {
          setTimeout(resolve, 400)
        })
        const current = await invoke<{
          url: string
          x: number
          y: number
          width: number
          height: number
          windowLabel: string
        }>('browser_preview_status')
        const png = await invoke<ArrayBuffer>('browser_preview_capture', { url: current.url })
        const image = new Image()
        const objectURL = URL.createObjectURL(new Blob([png], { type: 'image/png' }))
        try {
          image.src = objectURL
          await image.decode()
        } finally {
          URL.revokeObjectURL(objectURL)
        }
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Missing image pixel decoder')
        context.drawImage(image, 0, 0)
        const pixel = Array.from(
          context.getImageData(Math.floor(image.width / 2), Math.floor(image.height / 2), 1, 1).data
        )
        button('Capture into this design')
        let id = ''
        await wait(() => {
          const store = window.openPencil?.getStore?.()
          id = [...(store?.state.selectedIds ?? [])][0] ?? ''
          return !!store?.graph.getNode(id)?.fills?.some((fill) => fill.type === 'IMAGE')
        }, 'captured image layer')
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Missing selected document')
        const node = store.graph.getNode(id)
        if (!node) throw new Error('Capture layer disappeared')
        const hash = node.fills?.find((fill) => fill.type === 'IMAGE')?.imageHash
        const bytes = hash ? store.graph.images.get(hash)?.byteLength : 0
        // Verify the embedded surface yields to HTML modal portals, then comes back.
        const overlay = document.createElement('div')
        overlay.setAttribute('data-dismissable-layer', '')
        overlay.setAttribute('role', 'dialog')
        document.body.append(overlay)
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        overlay.remove()
        button('Close browser preview')
        await wait(async () => (await invoke('browser_preview_status')) === null, 'child destroyed')
        done({
          id,
          pixel,
          width: image.width,
          height: image.height,
          current,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          layerWidth: node.width,
          layerHeight: node.height,
          bytes
        })
      } catch (reason) {
        await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
        done({ error: String(reason) })
      }
    }, origin)
    assert.ok(!('error' in result), JSON.stringify(result))
    if ('error' in result) return
    console.debug('Embedded native capture evidence:', JSON.stringify(result))
    assert.deepEqual(result.pixel, [34, 170, 85, 255])
    assert.ok(result.rect.x > 0 && result.rect.y > 0)
    assert.equal(result.current.windowLabel, mainHandle)
    assert.ok(Math.abs(result.current.y - result.rect.y) < 2)
    assert.ok(result.current.x >= result.rect.x - 1)
    assert.ok(result.current.width <= result.rect.width)
    assert.equal(result.layerWidth, result.width)
    assert.equal(result.layerHeight, result.height)
    assert.ok(result.bytes && result.bytes > 8)
    assert.ok(ipcReports.length > 0)
    assert.ok(ipcReports.every((report) => report.includes('blocked=true,true,true&')))
    assert.deepEqual(await browser.getWindowHandles(), [mainHandle])
    await browser.keys(['Meta', 'z'])
    await browser.waitUntil(async () =>
      browser.execute((id) => !window.openPencil?.getStore?.()?.graph.getNode(id), result.id)
    )
  })

  it('rejects privileged URLs and bounds outside the editor', async () => {
    const bounds = { x: 800, y: 100, width: 390, height: 500 }
    await assert.rejects(invokeNative('browser_preview_open', { url: 'file:///etc/hosts', bounds }))
    await assert.rejects(
      invokeNative('browser_preview_open', { url: 'https://tauri.localhost/', bounds })
    )
    await assert.rejects(
      invokeNative('browser_preview_resize', { bounds: { ...bounds, width: 100000 } })
    )
    await assert.rejects(
      invokeNative('browser_preview_open', {
        url: `${origin}/first`,
        bounds: { ...bounds, x: -100 }
      })
    )
  })
})
