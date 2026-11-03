import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import type { Rect } from '@open-pencil/scene-graph'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

let server: Server
let origin: string
let dimensions = ''

before(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url?.startsWith('/report?')) {
      dimensions = new URL(request.url, 'http://fixture.test').searchParams.get('size') ?? ''
      response.end('ok')
      return
    }
    if (request.url === '/dimensions') {
      response.end(dimensions)
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(
      `<!doctype html><title>Viewport fixture</title><style>html,body{margin:0;background:#22aa55}article{width:64px;height:48px;background:#ff0000}</style><article></article><script>setInterval(()=>fetch('/report?size='+innerWidth+','+innerHeight),50)</script>`
    )
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing viewport fixture address')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})
after(() => {
  server.close()
})

it('uses real page zoom, fixed CSS device dimensions, disabled menu states and the system opener', async () => {
  const result = await browser.executeAsync<{ failure?: string }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      if (!invoke || !store) return done({ failure: 'Missing editor' })
      const before = {
        version: store.state.sceneVersion,
        selected: [...store.state.selectedIds],
        ids: store.graph.getChildren(store.state.currentPageId).map((node) => node.id)
      }
      const wait = async (check: () => boolean | Promise<boolean>, label: string) => {
        const end = Date.now() + 20000
        while (Date.now() < end) {
          if (await check()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
        }
        throw new Error(
          `Timed out: ${label}; page ${await (await fetch(origin + '/dimensions')).text()}`
        )
      }
      const click = (label: string) => {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!button || button.disabled) throw new Error(`Unavailable ${label}`)
        button.click()
      }
      const more = async () => {
        await wait(
          () => !document.querySelector('[role="menu"][data-state="open"]'),
          'previous menu closed'
        )
        await wait(
          () => !document.querySelector<HTMLButtonElement>('[aria-label="More options"]')?.disabled,
          'More ready'
        )
        click('More options')
        await wait(() => !!document.querySelector('[role="menu"][data-state="open"]'), 'More menu')
      }
      const item = (label: string) => {
        const node = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
          (node) => node.textContent?.trim() === label
        )
        if (!node || node.hasAttribute('data-disabled'))
          throw new Error(
            `Unavailable menu action ${label}: ${[...document.querySelectorAll('[role="menuitem"]')].map((entry) => `${entry.textContent?.trim()}:${entry.hasAttribute('data-disabled')}`).join('|')}`
          )
        node.click()
      }
      const status = () =>
        invoke<{ width: number; height: number; url: string; loading: boolean } | null>(
          'browser_preview_status'
        )
      const expectSize = (width: number, height?: number) =>
        wait(
          async () => {
            const size = (await (await fetch(origin + '/dimensions')).text()).split(',').map(Number)
            return size[0] === width && (height === undefined || size[1] === height)
          },
          `CSS viewport ${width}x${height ?? '*'}`
        )
      async function captureQuarter(current: Pick<Rect, 'width' | 'height'>) {
        for (const level of [0.9, 0.75, 0.5, 0.3, 0.25]) {
          await more()
          item('Zoom Out')
          await expectSize(Math.floor(current.width / level), Math.floor(current.height / level))
        }
        click('Screenshot')
        await wait(() => !!document.querySelector('[role="menuitem"]'), 'quarter-zoom camera')
        item('Visible Area')
        const page = store.state.currentPageId
        await wait(
          () => store.graph.getChildren(page).length === before.ids.length + 1,
          'quarter-zoom screenshot'
        )
        const frame = store.graph.getChildren(page).find((node) => !before.ids.includes(node.id))
        if (
          !frame ||
          frame.type !== 'FRAME' ||
          frame.width !== current.width * 4 ||
          frame.height !== current.height * 4
        )
          throw new Error('Quarter-zoom capture lost its CSS dimensions')
        const slices = store.graph.getChildren(frame.id)
        if (
          slices.length < 2 ||
          slices.reduce((height, node) => height + node.height, 0) !== frame.height
        )
          throw new Error('Large viewport was not captured as joined bounded slices')
        const hash = slices[0]?.fills.find((fill) => fill.type === 'IMAGE')?.imageHash
        const bytes = hash && store.graph.images.get(hash)
        if (
          !bytes ||
          new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16) !==
            frame.width * devicePixelRatio
        )
          throw new Error('Quarter-zoom capture lost native image density')
        const imageURL = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: 'image/png' })
        )
        try {
          const image = new Image()
          image.src = imageURL
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Missing screenshot pixel decoder')
          context.drawImage(image, 0, 0)
          if (
            [...context.getImageData(10 * devicePixelRatio, 10 * devicePixelRatio, 1, 1).data].join(
              ','
            ) !== '255,0,0,255'
          )
            throw new Error('Quarter-zoom screenshot misses the red page article')
        } finally {
          URL.revokeObjectURL(imageURL)
        }
        store.undoAction()
        if (
          store.graph
            .getChildren(page)
            .map((node) => node.id)
            .join(',') !== before.ids.join(',') ||
          [...store.state.selectedIds].join(',') !== before.selected.join(',')
        )
          throw new Error('Quarter-zoom screenshot Undo does not restore the design')
      }
      let outcome: { failure?: string } = {}
      try {
        click('Import Web via Browser')
        await wait(() => !!document.querySelector('[aria-label="Web address"]'), 'browser dock')
        const input = document.querySelector<HTMLInputElement>('[aria-label="Web address"]')
        if (!input) throw new Error('Missing address')
        input.value = origin + '/page'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input
          .closest('form')
          ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        await wait(async () => {
          const current = await status()
          return current?.url === origin + '/page' && !current.loading
        }, 'loaded fixture')
        const current = await status()
        if (!current) throw new Error('Missing native page')
        await wait(
          () => !document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled,
          'completed editor page state'
        )
        await expectSize(current.width * 2, current.height * 2)
        await more()
        item('Zoom In')
        await expectSize(Math.floor(current.width / 0.75))
        await more()
        item('Reset Zoom to 100%')
        await expectSize(current.width, current.height)
        await more()
        item('Open in System Browser')
        const opened: string[] = []
        await wait(async () => {
          opened.push(...(await invoke<string[]>('take_native_test_opened_urls')))
          return opened.length > 0
        }, 'system opener destination')
        if (opened.join(',') !== origin + '/page')
          throw new Error(`Wrong system browser destination: ${opened.join(',')}`)
        click('Viewport: Desktop. Switch to Phone')
        await expectSize(390, 844)
        await more()
        const zoomItems = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(
          (node) => /^(Zoom In|Zoom Out|Zoom:|Reset Zoom)/.test(node.textContent?.trim() ?? '')
        )
        if (zoomItems.length !== 4 || zoomItems.some((node) => !node.hasAttribute('data-disabled')))
          throw new Error('Fixed device permits a zoom mutation')
        document
          .querySelector<HTMLElement>('[role="menu"]')
          ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await wait(
          () => !document.querySelector('[role="menu"][data-state="open"]'),
          'dismissed menu'
        )
        click('Viewport: Phone. Switch to Tablet')
        await expectSize(1180, 820)
        click('Viewport: Tablet. Switch to Desktop')
        await expectSize(current.width, current.height)
        if (
          store.state.sceneVersion !== before.version ||
          [...store.state.selectedIds].join(',') !== before.selected.join(',')
        )
          throw new Error('Browser menu edits the design')
        await captureQuarter(current)
      } catch (reason) {
        outcome = { failure: String(reason) }
      } finally {
        document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
        await wait(async () => (await status()) === null, 'closed child')
      }
      done(outcome)
    },
    origin
  )
  assert.equal(result.failure, undefined)
})
