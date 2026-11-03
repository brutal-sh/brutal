import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let origin: string
let scrolling = 0
let lastY = 200
let mainHandle: string

before(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url?.startsWith('/scroll?')) {
      scrolling++
      lastY = Number(new URL(request.url, 'http://fixture.test').searchParams.get('y'))
      response.end('ok')
      return
    }
    if (request.url === '/scroll-count') {
      response.end(String(scrolling))
      return
    }
    if (request.url === '/scroll-y') {
      response.end(String(lastY))
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html' })
    // oxlint-disable-next-line open-pencil/no-hand-rolled-color -- Exact native screenshot pixels.
    response.end(
      `<!doctype html><title>Tall capture fixture</title><style>html,body{margin:0}body{height:1800px;background:linear-gradient(to bottom,#112233 0px,#112233 600px,#22aa55 600px,#22aa55 1200px,#3344cc 1200px,#3344cc 1800px)}header{position:fixed;left:0;top:0;height:30px;width:100%;background:#ff0000}</style><header></header><script>scrollTo(0,200);addEventListener('scroll',()=>fetch('/scroll?y='+scrollY));</script>`
    )
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing screenshot fixture address')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createNativeLayerFixture()
  mainHandle = await browser.getWindowHandle()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})

beforeEach(async () => {
  await browser.switchToWindow(mainHandle)
})

after(async () => {
  await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
  server?.close()
})

it('imports full-page slices at CSS size, joins native pixels, restores scrolling and undoes once', async () => {
  const result = await browser.executeAsync<{ failure?: string; slices?: number }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      if (!invoke || !store) return done({ failure: 'Missing native editor' })
      const pageId = store.state.currentPageId
      const initial = store.graph.getChildren(pageId).map((node) => node.id)
      const wait = async (check: () => boolean | Promise<boolean>, label: string) => {
        const deadline = Date.now() + 25000
        while (Date.now() < deadline) {
          if (await check()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 25)
          })
        }
        throw new Error(`Timed out: ${label}`)
      }
      const click = (label: string) => {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!button || button.disabled) throw new Error(`Unavailable ${label}`)
        button.click()
      }
      const sample = async (bytes: Uint8Array, x: number, y: number) => {
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
        try {
          const image = new Image()
          image.src = url
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Missing native pixel decoder')
          context.drawImage(image, 0, 0)
          return [
            ...context.getImageData(
              Math.floor(x * devicePixelRatio),
              Math.floor(y * devicePixelRatio),
              1,
              1
            ).data
          ]
        } finally {
          URL.revokeObjectURL(url)
        }
      }
      function validateFrame(
        frame: ReturnType<typeof store.graph.getNode>
      ): asserts frame is NonNullable<ReturnType<typeof store.graph.getNode>> {
        if (
          !frame ||
          frame.type !== 'FRAME' ||
          frame.height !== 1800 ||
          frame.parentId !== pageId ||
          frame.x !== 240 ||
          frame.y !== 0
        )
          throw new Error(
            `Wrong screenshot placement: ${JSON.stringify(frame && { type: frame.type, width: frame.width, height: frame.height, x: frame.x, y: frame.y, parentId: frame.parentId })}`
          )
      }
      async function inspectSlices(frame: NonNullable<ReturnType<typeof store.graph.getNode>>) {
        const slices = store.graph.getChildren(frame.id)
        if (slices.length < 2) throw new Error('Tall capture did not create multiple slices')
        let y = 0
        for (const slice of slices) {
          if (
            slice.type !== 'RECTANGLE' ||
            slice.y !== y ||
            slice.width !== frame.width ||
            !slice.height
          )
            throw new Error('Screenshot slices do not join at CSS dimensions')
          const hash = slice.fills?.find((fill) => fill.type === 'IMAGE')?.imageHash
          const bytes = hash && store.graph.images.get(hash)
          if (!bytes) throw new Error('Missing screenshot pixels')
          const local = Math.min(40, slice.height - 1)
          const absolute = y + local
          let expected = '51,68,204,255'
          if (absolute < 1200) expected = '34,170,85,255'
          if (absolute < 600) expected = '17,34,51,255'
          if ((await sample(bytes, 10, local)).join(',') !== expected)
            throw new Error(`Wrong pixels at page y${absolute}`)
          if (y === 0 && (await sample(bytes, 10, 10)).join(',') !== '255,0,0,255')
            throw new Error('Fixed header disappeared from the first slice')
          y += slice.height
        }
        if (y !== 1800) throw new Error('Screenshot height does not match the whole page')
        return slices.length
      }
      let outcome: { failure?: string; slices?: number } = {}
      try {
        click('Import Web via Browser')
        await wait(
          () => !!document.querySelector('[data-test-id="browser-preview-surface"]'),
          'browser dock'
        )
        const input = document.querySelector<HTMLInputElement>('[aria-label="Web address"]')
        if (!input) throw new Error('Missing browser address')
        input.value = origin + '/page'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input
          .closest('form')
          ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        await wait(async () => {
          const status = await invoke<{ url: string; loading: boolean } | null>(
            'browser_preview_status'
          )
          return status?.url === origin + '/page' && !status.loading
        }, 'committed page')
        await wait(
          () => !document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled,
          'camera ready'
        )
        const parent = store.graph.createNode('FRAME', pageId, {
          x: 100,
          y: 20,
          width: 100,
          height: 100
        })
        store.select([parent.id])
        click('Screenshot')
        await wait(() => !!document.querySelector('[role="menuitem"]'), 'screenshot menu')
        const full = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
          (item) => item.textContent?.trim() === 'Full Page'
        )
        if (!full) throw new Error('Missing full-page action')
        full.click()
        await wait(
          () => store.graph.getChildren(pageId).length === initial.length + 2,
          'one screenshot frame'
        )
        const frame = store.graph
          .getChildren(pageId)
          .find((node) => !initial.includes(node.id) && node.id !== parent.id)
        validateFrame(frame)
        const sliceCount = await inspectSlices(frame)
        await wait(
          async () => Number(await (await fetch(origin + '/scroll-y')).text()) === 200,
          'restored page scroll'
        )
        store.undoAction()
        if (store.graph.getNode(frame.id) || !store.state.selectedIds.has(parent.id))
          throw new Error('Screenshot Undo is incomplete')
        store.redoAction()
        if (store.graph.getChildren(frame.id).length !== sliceCount)
          throw new Error('Screenshot Redo lost slices')
        store.undoAction()
        outcome = { slices: sliceCount }
      } catch (reason) {
        outcome = { failure: String(reason) }
      } finally {
        document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
        await wait(
          async () => (await invoke('browser_preview_status')) === null,
          'closed native page'
        )
      }
      done(outcome)
    },
    origin
  )
  assert.equal(result.failure, undefined)
  assert.ok((result.slices ?? 0) >= 2)
})

it('cancels a native tiled capture, restores the page and leaves the design untouched', async () => {
  const result = await browser.executeAsync<{ failure?: string }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      if (!invoke || !store) return done({ failure: 'Missing native editor' })
      const before = { version: store.state.sceneVersion, ids: [...store.state.selectedIds] }
      const wait = async (check: () => Promise<boolean>, label: string) => {
        const deadline = Date.now() + 10000
        while (Date.now() < deadline) {
          if (await check()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 20)
          })
        }
        throw new Error(`Timed out: ${label}`)
      }
      let outcome: { failure?: string } = {}
      try {
        await invoke('browser_preview_open', {
          url: origin + '/page',
          bounds: { x: 500, y: 200, width: 320, height: 500 }
        })
        await wait(
          async () => !(await invoke<{ loading: boolean }>('browser_preview_status')).loading,
          'completed page'
        )
        await wait(
          async () => Number(await (await fetch(origin + '/scroll-y')).text()) === 200,
          'initial scroll'
        )
        const count = Number(await (await fetch(origin + '/scroll-count')).text())
        const capturing = invoke('browser_preview_screenshot', {
          url: origin + '/page',
          requestId: crypto.randomUUID(),
          scope: 'full'
        }).then(() => '', String)
        await wait(
          async () => Number(await (await fetch(origin + '/scroll-count')).text()) > count,
          'capture scrolling'
        )
        await invoke('browser_preview_action', { action: 'cancelcapture' })
        const failure = await capturing
        if (!failure.includes('cancelled')) throw new Error(`Capture did not cancel: ${failure}`)
        await wait(
          async () => Number(await (await fetch(origin + '/scroll-y')).text()) === 200,
          'restored cancelled scroll'
        )
        if (
          store.state.sceneVersion !== before.version ||
          [...store.state.selectedIds].join(',') !== before.ids.join(',')
        )
          throw new Error('Cancelled capture mutated the design')
        outcome = {}
      } catch (reason) {
        outcome = { failure: String(reason) }
      } finally {
        await invoke('browser_preview_action', { action: 'close' })
      }
      done(outcome)
    },
    origin
  )
  assert.equal(result.failure, undefined)
})
