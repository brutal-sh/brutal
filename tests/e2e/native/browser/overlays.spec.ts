import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let origin: string
let blue = false
let rendered = false

before(async function () {
  if (process.platform !== 'darwin') this.skip()
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url === '/change') {
      blue = true
      response.end('ok')
    } else if (request.url === '/color') {
      response.end(blue ? '#3355ee' : '#22aa55')
    } else if (request.url === '/rendered') {
      response.end(String(rendered))
    } else if (request.url === '/blue') {
      rendered = true
      response.end('ok')
    } else {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(
        '<!doctype html><title>Editor overlay fixture</title><style>html,body{margin:0;background:#22aa55}</style><script>setInterval(async()=>{const color=await(await fetch("/color")).text();document.documentElement.style.background=color;document.body.style.background=color;if(color==="#3355ee")fetch("/blue")},50)</script>'
      )
    }
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing overlay fixture address')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})

after(async () => {
  await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
  server.close()
})

it('prepares fresh page pixels beneath the first and subsequent editor menus without editing the design', async () => {
  const result = await browser.executeAsync<{ failure?: string }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      if (!invoke || !store) return done({ failure: 'Missing native editor' })
      const before = {
        version: store.state.sceneVersion,
        selected: [...store.state.selectedIds].join(',')
      }
      const wait = async (check: () => boolean | Promise<boolean>, label: string) => {
        const end = Date.now() + 15000
        while (!(await check())) {
          if (Date.now() > end) throw new Error(`Timed out: ${label}`)
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
      async function openEditorMenu(expected: string) {
        const previous = document.querySelector<HTMLImageElement>(
          '[data-slot="browser-backdrop"]'
        )?.src
        document.querySelector<HTMLButtonElement>('[data-test-id="zoom-dropdown-trigger"]')?.click()
        await wait(
          () => document.hasFocus() && !!document.querySelector('[role="menu"][data-state="open"]'),
          'editor menu owns focus'
        )
        await wait(() => {
          const image = document.querySelector<HTMLImageElement>('[data-slot="browser-backdrop"]')
          return !!image?.complete && image.naturalWidth > 0 && image.src !== previous
        }, 'fresh editor-menu backdrop')
        const image = document.querySelector<HTMLImageElement>('[data-slot="browser-backdrop"]')
        if (!image) throw new Error('Missing editor-menu backdrop')
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Missing frame decoder')
        context.drawImage(image, 0, 0)
        const pixel = [
          ...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1)
            .data
        ].join(',')
        if (pixel !== expected) throw new Error(`Stale or blank editor backdrop: ${pixel}`)
        document
          .querySelector('[role="menu"]')
          ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await wait(
          () => !document.querySelector('[role="menu"][data-state="open"]'),
          'editor menu dismissed'
        )
      }
      let result: { failure?: string } = {}
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
          const status = await invoke<{ loading: boolean; url: string } | null>(
            'browser_preview_status'
          )
          return (
            status?.url === origin + '/page' &&
            !status.loading &&
            document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled ===
              false
          )
        }, 'loaded page')
        if (document.querySelector('[data-slot="browser-backdrop"]'))
          throw new Error('Fixture already prepared a browser-popup backdrop')
        await openEditorMenu('34,170,85,255')
        await fetch(origin + '/change')
        await wait(
          async () => (await (await fetch(origin + '/rendered')).text()) === 'true',
          'page changed to blue'
        )
        await openEditorMenu('51,85,238,255')
        if (
          store.state.sceneVersion !== before.version ||
          [...store.state.selectedIds].join(',') !== before.selected
        )
          throw new Error('Editor menu backdrop changed the design')
      } catch (reason) {
        result = { failure: String(reason) }
      } finally {
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

it('delivers an enabled screenshot choice while a later image decode is slow', async () => {
  const result = await browser.executeAsync<{ failure?: string }>(async (done) => {
    const invoke = window.__TAURI__?.core.invoke
    const store = window.openPencil?.getStore?.()
    if (!invoke || !store) return done({ failure: 'Missing native editor' })
    const before = store.graph.getChildren(store.state.currentPageId).map((node) => node.id)
    const wait = async (check: () => boolean | Promise<boolean>, label: string) => {
      const end = Date.now() + 15000
      while (!(await check())) {
        if (Date.now() > end) throw new Error(`Timed out: ${label}`)
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
      }
    }
    const decode = HTMLImageElement.prototype.decode
    let reads = 0
    let result: { failure?: string } = {}
    try {
      document.querySelector<HTMLButtonElement>('[aria-label="Import Web via Browser"]')?.click()
      await wait(
        () =>
          document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled ===
          false,
        'restored capturable page'
      )
      HTMLImageElement.prototype.decode = async function () {
        await decode.call(this)
        if (this.src.startsWith('blob:') && ++reads === 2) {
          await new Promise((resolve) => {
            setTimeout(resolve, 1000)
          })
        }
      }
      document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.click()
      await wait(
        () => !!document.querySelector('[role="menu"][data-state="open"]'),
        'screenshot menu'
      )
      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })
      const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
        (node) => node.textContent?.trim() === 'Visible Area'
      )
      if (!item || item.hasAttribute('data-disabled'))
        throw new Error('Screenshot choice is unavailable')
      item.click()
      await wait(
        () => store.graph.getChildren(store.state.currentPageId).length === before.length + 1,
        'enabled screenshot delivered'
      )
      const inserted = store.graph
        .getChildren(store.state.currentPageId)
        .find((node) => !before.includes(node.id))
      if (!inserted?.fills?.some((fill) => fill.type === 'IMAGE'))
        throw new Error('Screenshot did not insert image pixels')
      store.undoAction()
      if (
        store.graph
          .getChildren(store.state.currentPageId)
          .map((node) => node.id)
          .join(',') !== before.join(',')
      )
        throw new Error('Screenshot Undo did not restore the fixture')
    } catch (reason) {
      result = { failure: String(reason) }
    } finally {
      HTMLImageElement.prototype.decode = decode
      document
        .querySelector('[role="menu"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      document.querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')?.click()
      await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
    }
    done(result)
  })
  assert.equal(result.failure, undefined, result.failure)
})

function verifyStaleFrameFailure(reopen: boolean) {
  it(
    reopen
      ? 'discards a stale frame failure after the same editor menu reopens'
      : 'discards a stale frame failure after the editor menu has closed',
    async () => {
      const result = await browser.executeAsync<{ failure?: string }, [string, boolean]>(
        async (origin, reopen, done) => {
          const invoke = window.__TAURI__?.core.invoke
          if (!invoke) return done({ failure: 'Missing native editor' })
          const wait = async (check: () => boolean | Promise<boolean>, label: string) => {
            const end = Date.now() + 15000
            while (!(await check())) {
              if (Date.now() > end) throw new Error(`Timed out: ${label}`)
              await new Promise((resolve) => {
                setTimeout(resolve, 30)
              })
            }
          }
          const decode = HTMLImageElement.prototype.decode
          const pending: { reject?: (reason: Error) => void } = {}
          let result: { failure?: string } = {}
          try {
            document
              .querySelector<HTMLButtonElement>('[aria-label="Import Web via Browser"]')
              ?.click()
            await wait(() => !!document.querySelector('[aria-label="Web address"]'), 'browser dock')
            const input = document.querySelector<HTMLInputElement>('[aria-label="Web address"]')
            if (!input) throw new Error('Missing address')
            input.value = origin + '/page'
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input
              .closest('form')
              ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            await wait(
              () =>
                document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled ===
                false,
              'capturable page'
            )
            HTMLImageElement.prototype.decode = async function () {
              await decode.call(this)
              if (this.src.startsWith('blob:') && !pending.reject)
                await new Promise<void>((_resolve, reject) => {
                  pending.reject = reject
                })
            }
            document
              .querySelector<HTMLButtonElement>('[data-test-id="zoom-dropdown-trigger"]')
              ?.click()
            await wait(() => !!pending.reject, 'held editor frame')
            document
              .querySelector('[role="menu"]')
              ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
            await wait(
              () => !document.querySelector('[role="menu"][data-state="open"]'),
              'menu dismissed'
            )
            if (reopen) {
              document
                .querySelector<HTMLButtonElement>('[data-test-id="zoom-dropdown-trigger"]')
                ?.click()
              await wait(
                () => !!document.querySelector('[role="menu"][data-state="open"]'),
                'same menu reopened'
              )
              await wait(() => {
                const image = document.querySelector<HTMLImageElement>(
                  '[data-slot="browser-backdrop"]'
                )
                return !!image?.complete && image.naturalWidth > 0
              }, 'new menu frame prepared')
            }
            pending.reject?.(new Error('Stale frame fixture failure'))
            await wait(
              () =>
                document.querySelector<HTMLButtonElement>('[aria-label="Screenshot"]')?.disabled ===
                false,
              'frame preparation settled'
            )
            await new Promise((resolve) => {
              setTimeout(resolve, 50)
            })
            if (
              [...document.querySelectorAll('[data-slot="toast"]')].some((node) =>
                node.textContent?.includes('Stale frame fixture failure')
              )
            )
              throw new Error('A dismissed menu published its stale frame failure')
          } catch (reason) {
            result = { failure: String(reason) }
          } finally {
            HTMLImageElement.prototype.decode = decode
            pending.reject?.(new Error('Fixture cleanup'))
            document
              .querySelector('[role="menu"]')
              ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
            document
              .querySelector<HTMLButtonElement>('[aria-label="Close browser preview"]')
              ?.click()
            await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
          }
          done(result)
        },
        origin,
        reopen
      )
      assert.equal(result.failure, undefined, result.failure)
    }
  )
}

verifyStaleFrameFailure(false)
verifyStaleFrameFailure(true)
