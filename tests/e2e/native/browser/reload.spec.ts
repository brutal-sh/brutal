import { strict as assert } from 'node:assert'
import { createServer, type Server, type ServerResponse } from 'node:http'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let origin: string
let released = false
const pending: ServerResponse[] = []
const finish = (response: ServerResponse) => {
  response.writeHead(200, { 'Content-Type': 'text/html' })
  response.end(
    '<!doctype html><title>Reload fixture</title><style>html,body{margin:0;background:#22aa55}</style>'
  )
}

before(async function () {
  if (process.platform !== 'darwin') this.skip()
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url === '/release') {
      released = true
      for (const held of pending.splice(0)) if (!held.destroyed) finish(held)
      response.end('released')
    } else if (!released) pending.push(response)
    else finish(response)
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing reload fixture address')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})

after(async () => {
  for (const held of pending.splice(0)) held.end()
  await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
  server.close()
})

it('reloads a first navigation before its response commits and subsequently captures the loaded page', async () => {
  const result = await browser.executeAsync<{ failure?: string }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      if (!invoke || !store) return done({ failure: 'Missing native editor' })
      const ids = store.graph.getChildren(store.state.currentPageId).map((node) => node.id)
      const wait = async (check: () => boolean | Promise<boolean>, label: string) => {
        const end = Date.now() + 15000
        while (!(await check())) {
          if (Date.now() > end)
            throw new Error(
              `Timed out: ${label}; ${JSON.stringify(await invoke('browser_preview_status'))}`
            )
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
        }
      }
      const click = (label: string) => {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!button || button.disabled) throw new Error(`Unavailable ${label}`)
        button.click()
      }
      async function verifyCapturedPage() {
        const node = store.graph
          .getChildren(store.state.currentPageId)
          .find((node) => !ids.includes(node.id))
        const hash = node?.fills?.find((fill) => fill.type === 'IMAGE')?.imageHash
        const bytes = hash && store.graph.images.get(hash)
        if (!bytes) throw new Error('Reload capture has no image pixels')
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
        try {
          const image = new Image()
          image.src = url
          await image.decode()
          const canvas = document.createElement('canvas')
          canvas.width = image.width
          canvas.height = image.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Missing reloaded image decoder')
          context.drawImage(image, 0, 0)
          if (
            [
              ...context.getImageData(
                Math.floor(image.width / 2),
                Math.floor(image.height / 2),
                1,
                1
              ).data
            ].join(',') !== '34,170,85,255'
          )
            throw new Error('Reload capture did not retain the loaded green page')
        } finally {
          URL.revokeObjectURL(url)
        }
      }
      let result: { failure?: string } = {}
      try {
        click('Import Web via Browser')
        await wait(() => !!document.querySelector('[aria-label="Web address"]'), 'browser dock')
        const input = document.querySelector<HTMLInputElement>('[aria-label="Web address"]')
        if (!input) throw new Error('Missing address')
        input.value = origin + '/pending'
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input
          .closest('form')
          ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        await wait(async () => {
          const status = await invoke<{ url: string; loading: boolean } | null>(
            'browser_preview_status'
          )
          return (
            status?.url === origin + '/pending' &&
            status.loading &&
            document.querySelector<HTMLButtonElement>('[aria-label="Reload"]')?.disabled === false
          )
        }, 'provisional navigation')
        click('Reload')
        await wait(
          () =>
            document.querySelector<HTMLButtonElement>('[aria-label="Reload"]')?.disabled === false,
          'reload delivered'
        )
        await fetch(origin + '/release')
        await wait(async () => {
          const status = await invoke<{ url: string; loading: boolean } | null>(
            'browser_preview_status'
          )
          return status?.url === origin + '/pending' && !status.loading
        }, 'reloaded response committed')
        await wait(
          () =>
            document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled ===
            false,
          'capture ready'
        )
        click('Screenshot')
        await wait(
          () => !!document.querySelector('[role="menu"][data-state="open"]'),
          'capture menu'
        )
        const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
          (node) => node.textContent?.trim() === 'Visible Area'
        )
        if (!item || item.hasAttribute('data-disabled')) throw new Error('Capture unavailable')
        item.click()
        await wait(
          () => store.graph.getChildren(store.state.currentPageId).length === ids.length + 1,
          'captured reloaded page'
        )
        await verifyCapturedPage()
        store.undoAction()
        if (
          store.graph
            .getChildren(store.state.currentPageId)
            .map((node) => node.id)
            .join(',') !== ids.join(',')
        )
          throw new Error('Reload capture Undo did not restore the fixture')
      } catch (reason) {
        result = { failure: String(reason) }
      } finally {
        await fetch(origin + '/release')
        document
          .querySelector('[role="menu"]')
          ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
        await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
      }
      done(result)
    },
    origin
  )
  assert.equal(result.failure, undefined, result.failure)
})
