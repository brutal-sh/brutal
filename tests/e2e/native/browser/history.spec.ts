import { strict as assert } from 'node:assert'
import { createServer, type Server, type ServerResponse } from 'node:http'

import * as v from 'valibot'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let heldPage: ServerResponse | undefined
let origin: string
let releaseRequested = false

before(async () => {
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url === '/release') {
      if (heldPage) heldPage.end('</body></html>')
      else releaseRequested = true
      heldPage = undefined
      response.end('released')
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.write('<!doctype html><title>History fixture</title><body><h1>History page</h1>')
    if (request.url === '/slow' && !releaseRequested) heldPage = response
    else {
      releaseRequested = false
      response.end('</body></html>')
    }
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No history fixture address')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})

after(async () => {
  heldPage?.end()
  await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
  server.close()
})

it('retains unique pending pages across repeated visits before the history menu mounts', async () => {
  const result = await browser.executeAsync<{ failure?: string; visits?: unknown }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      if (!invoke) return done({ failure: 'Missing native editor' })
      let result: { failure?: string; visits?: unknown } = {}
      try {
        await invoke('clear_browser_preview_visits')
        const paths = [
          '/queued/c',
          ...Array.from({ length: 51 }, (_, index) => (index % 2 === 0 ? '/queued/a' : '/queued/b'))
        ]
        for (const path of paths) {
          await invoke('browser_preview_open', {
            url: origin + path,
            bounds: { x: 100, y: 100, width: 400, height: 400 }
          })
          const deadline = Date.now() + 15000
          let loaded = false
          while (Date.now() < deadline) {
            const status = await invoke<{ url: string; loading: boolean } | null>(
              'browser_preview_status'
            )
            if (status?.url === origin + path && !status.loading) {
              loaded = true
              break
            }
            await new Promise((resolve) => {
              setTimeout(resolve, 20)
            })
          }
          if (!loaded) throw new Error('Pending history page did not finish loading')
        }
        result.visits = await invoke('take_browser_preview_visits')
      } catch (reason) {
        result = { failure: String(reason) }
      } finally {
        await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
      }
      done(result)
    },
    origin
  )
  assert.equal(result.failure, undefined, result.failure)
  const visits = v.parse(v.array(v.object({ url: v.string() })), result.visits)
  assert.equal(visits.length, 3)
  assert.ok(visits.some((visit) => visit.url === origin + '/queued/c'))
})

it('records completed pages, revisits from history, removes entries and clears saved history', async () => {
  const result = await browser.executeAsync<{ failure?: string }, [string]>(
    async (origin, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      if (!invoke || !store) return done({ failure: 'Missing native editor' })
      const before = { version: store.state.sceneVersion, selected: [...store.state.selectedIds] }
      const wait = async (condition: () => boolean | Promise<boolean>, label: string) => {
        const deadline = Date.now() + 15000
        while (Date.now() < deadline) {
          if (await condition()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 30)
          })
        }
        throw new Error(`Timed out: ${label}`)
      }
      const button = (label: string) => {
        const control =
          document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) ??
          [...document.querySelectorAll<HTMLButtonElement>('button')].find(
            (node) => node.textContent?.trim() === label
          )
        if (!control || control.disabled) throw new Error(`Unavailable ${label}`)
        control.click()
      }
      const menuItem = (text: string) =>
        [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
          (node) => node.textContent?.trim() === text
        )
      const label = (path: string) => `${new URL(origin).host}${path}`
      const navigate = async (path: string) => {
        const input = document.querySelector<HTMLInputElement>('input[aria-label="Web address"]')
        if (!input || input.disabled) throw new Error('Address is unavailable')
        input.focus()
        input.value = origin + path
        input.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
        input
          .closest('form')
          ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        await wait(
          async () =>
            (await invoke<{ url: string } | null>('browser_preview_status'))?.url === origin + path,
          'navigation'
        )
      }
      const ready = () => {
        const control = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Import editable page"]'
        )
        return !!control && !control.disabled
      }
      const closePage = async () => {
        button('Close this page')
        await wait(async () => (await invoke('browser_preview_status')) === null, 'page close')
      }
      let result: { failure?: string } = {}
      let stage = 'opening dock'
      try {
        button('Import Web via Browser')
        await wait(() => !!document.querySelector('input[aria-label="Web address"]'), 'dock')
        stage = 'slow page navigation'
        await navigate('/slow')
        await wait(
          async () =>
            (await invoke<{ loading: boolean } | null>('browser_preview_status'))?.loading === true,
          'controlled loading state'
        )
        if (ready()) throw new Error('Import is enabled before loading finishes')
        let refused = false
        try {
          await invoke('browser_preview_extract', {
            url: origin + '/slow',
            requestId: crypto.randomUUID()
          })
        } catch {
          refused = true
        }
        if (!refused) throw new Error('Native extraction accepts an unfinished page')
        stage = 'release controlled load'
        await fetch(origin + '/release')
        await wait(ready, 'completed page controls')
        stage = 'closing page'
        await closePage()
        await wait(
          () =>
            [...document.querySelectorAll('button')].some(
              (node) => node.textContent?.trim() === label('/slow')
            ),
          'recent page'
        )
        stage = 'history menu'
        button('Browsing history')
        await wait(() => !!menuItem(label('/slow')), 'history menu entry')
        menuItem(label('/slow'))?.click()
        await wait(
          async () =>
            (await invoke<{ url: string } | null>('browser_preview_status'))?.url ===
            origin + '/slow',
          'history revisit'
        )
        stage = 'release controlled load'
        await fetch(origin + '/release')
        await wait(ready, 'revisited page controls')
        stage = 'closing page'
        await closePage()
        button(`Remove ${label('/slow')} from history`)
        await wait(
          () =>
            ![...document.querySelectorAll('button')].some(
              (node) => node.textContent?.trim() === label('/slow')
            ),
          'removed recent entry'
        )
        stage = 'fresh navigation'
        await navigate('/fresh')
        await wait(ready, 'fresh page controls')
        stage = 'closing page'
        await closePage()
        await wait(
          () =>
            [...document.querySelectorAll('button')].some(
              (node) => node.textContent?.trim() === label('/fresh')
            ),
          'new recent entry'
        )
        stage = 'history menu'
        button('Browsing history')
        await wait(() => !!menuItem('Clear All History'), 'clear action')
        menuItem('Clear All History')?.click()
        await wait(
          // oxlint-disable-next-line open-pencil/no-direct-storage-access -- Read only this isolated test profile's history key to verify persisted deletion.
          () => localStorage.getItem('open-pen:browser-history') === null,
          'saved history deletion'
        )
        stage = 'history menu'
        button('Browsing history')
        await wait(() => !!menuItem('No History'), 'empty menu')
        stage = 'history menu'
        button('Browsing history')
        await wait(
          () => !document.querySelector('[role="menu"][data-state="open"]'),
          'closed empty menu'
        )
        for (let index = 0; index < 55; index++) {
          stage = `history navigation ${index}`
          await navigate(`/history/${index}`)
          await wait(async () => {
            const status = await invoke<{ url: string; loading: boolean } | null>(
              'browser_preview_status'
            )
            return status?.url === `${origin}/history/${index}` && !status.loading
          }, 'completed short visit')
        }
        stage = 'closing page'
        await closePage()
        await wait(
          () =>
            document.querySelectorAll(
              '[data-test-id="browser-preview-dock"] button[aria-label^="Remove "]'
            ).length === 50,
          'fifty retained visits'
        )
        if (
          [...document.querySelectorAll('button')].some(
            (node) => node.textContent?.trim() === label('/history/0')
          )
        )
          throw new Error('Old history entry exceeds limit')
        stage = 'history menu'
        button('Browsing history')
        await wait(
          () =>
            document.querySelectorAll('[role="menu"][data-state="open"] [role="menuitem"]')
              .length === 51,
          'complete history menu'
        )
        if (!menuItem(label('/history/54')) || !menuItem(label('/history/5')))
          throw new Error('History loses retained endpoints')
        menuItem('Clear All History')?.click()
        await wait(
          // oxlint-disable-next-line open-pencil/no-direct-storage-access -- Read only this isolated test profile's history key to verify persisted deletion.
          () => localStorage.getItem('open-pen:browser-history') === null,
          'final saved history deletion'
        )
        if (
          store.state.sceneVersion !== before.version ||
          [...store.state.selectedIds].join(',') !== before.selected.join(',')
        )
          throw new Error('History changes the design')
      } catch (reason) {
        result = { failure: `${stage}: ${String(reason)}` }
      } finally {
        document
          .querySelector<HTMLButtonElement>('button[aria-label="Close browser preview"]')
          ?.click()
        await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
      }
      done(result)
    },
    origin
  )
  assert.equal(result.failure, undefined, result.failure)
})

it('restores saved history after reloading the native editor and persists its deletion', async () => {
  const recorded = await browser.executeAsync<{ failure?: string }, [string]>(async (url, done) => {
    const invoke = window.__TAURI__?.core.invoke
    if (!invoke) return done({ failure: 'Missing native invoke' })
    let result = {}
    try {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Import Web via Browser"]')
        ?.click()
      const deadline = Date.now() + 15000
      while (!document.querySelector('input[aria-label="Web address"]')) {
        if (Date.now() > deadline) throw new Error('Missing browser dock')
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
      }
      await invoke('browser_preview_open', {
        url,
        bounds: { x: 100, y: 100, width: 400, height: 400 }
      })
      let loaded = false
      while (Date.now() < deadline) {
        const status = await invoke<{ url: string; loading: boolean } | null>(
          'browser_preview_status'
        )
        if (status?.url === url && !status.loading) {
          loaded = true
          break
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
      }
      if (!loaded) throw new Error('Unfinished history fixture')
      await invoke('browser_preview_action', { action: 'close' })
    } catch (reason) {
      result = { failure: String(reason) }
    } finally {
      await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
    }
    done(result)
  }, origin + '/reload')
  assert.equal(recorded.failure, undefined, recorded.failure)
  await $(`button=${new URL(origin).host}/reload`).waitForDisplayed()
  async function reloadEditor() {
    const before = await browser.execute(() => performance.timeOrigin)
    await browser.refresh()
    await browser.waitUntil(async () =>
      browser.execute((origin) => performance.timeOrigin !== origin, before)
    )
    const fixture = await createNativeLayerFixture()
    await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
    await $('button[aria-label="Import Web via Browser"]').click()
    await $('button=Enter a URL').waitForDisplayed()
  }
  await reloadEditor()
  await $(`button=${new URL(origin).host}/reload`).waitForDisplayed()
  await $('button=Clear All').click()
  await $(`button=${new URL(origin).host}/reload`).waitForExist({ reverse: true })
  await reloadEditor()
  assert.equal(await $(`button=${new URL(origin).host}/reload`).isExisting(), false)
  await $('button[aria-label="Browsing history"]').click()
  await $('[role="menuitem"]=No History').waitForDisplayed()
  await browser.keys('Escape')
  await $('button[aria-label="Close browser preview"]').click()
})
