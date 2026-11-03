import { strict as assert } from 'node:assert'
import { createServer, type Server } from 'node:http'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

let servers: Server[] = []
const origins: string[] = []

before(async () => {
  servers = [0, 1].map(() => {
    let seeded = false
    let state = ''
    return createServer((request, response) => {
      response.setHeader('Access-Control-Allow-Origin', '*')
      if (request.url === '/worker.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript' })
        response.end("self.addEventListener('install',()=>self.skipWaiting())")
        return
      }
      if (request.url?.startsWith('/report?')) {
        const values = new URL(request.url, 'http://fixture.test').searchParams.get('state') ?? ''
        state = values + ',' + Number(request.headers.cookie?.includes('openpen-native=1') ?? false)
        response.end('ok')
        return
      }
      if (request.url === '/state') {
        response.end(state)
        return
      }
      const seed = !seeded
      seeded = true
      if (seed) response.setHeader('Set-Cookie', 'openpen-native=1; HttpOnly; SameSite=Lax; Path=/')
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(`<!doctype html><title>Disposable site data fixture</title><p>Native test storage</p><script>(async()=>{
        if(${seed}) {
          localStorage.setItem('sentinel','fixture'); sessionStorage.setItem('sentinel','fixture');
          await new Promise((resolve,reject)=>{const request=indexedDB.open('openpen-acceptance',1);request.onsuccess=()=>{request.result.close();resolve()};request.onerror=reject});
          const cache=await caches.open('openpen-acceptance');await cache.put('/synthetic-cache',new Response('fixture'));
          await navigator.serviceWorker.register('/worker.js',{scope:'/storage/'});
        }
        const report=async()=>{try{const state=[Number(!!localStorage.getItem('sentinel')),Number(!!sessionStorage.getItem('sentinel')),(await indexedDB.databases()).length,(await caches.keys()).length,(await navigator.serviceWorker.getRegistrations()).length];await fetch('/report?state='+state.join(','))}catch{}};
        await report();setInterval(report,100);
      })()</script>`)
    })
  })
  for (const server of servers) {
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing storage fixture address')
    origins.push(`http://127.0.0.1:${address.port}`)
  }
  await createNativeLayerFixture()
})
after(() => {
  for (const server of servers) server.close()
})

it('clears only the current origin stores and related HTTP-only cookies, then reloads', async () => {
  const result = await browser.executeAsync<{ failure?: string }, [string[]]>(
    async (origins, done) => {
      const invoke = window.__TAURI__?.core.invoke
      const store = window.openPencil?.getStore?.()
      const current = origins[0],
        other = origins[1]
      if (!invoke || !store || !current || !other)
        return done({ failure: 'Missing native fixture' })
      const before = { version: store.state.sceneVersion, selected: [...store.state.selectedIds] }
      const wait = async (check: () => Promise<boolean>, label: string) => {
        const end = Date.now() + 20000
        while (Date.now() < end) {
          if (await check()) return
          await new Promise((resolve) => {
            setTimeout(resolve, 50)
          })
        }
        throw new Error(`Timed out: ${label}`)
      }
      const read = async (origin: string) => await (await fetch(origin + '/state')).text()
      const open = async (origin: string) => {
        await invoke('browser_preview_open', {
          url: origin + '/storage/page',
          bounds: { x: 800, y: 100, width: 390, height: 500 },
          zoom: 1
        })
        await wait(async () => {
          const status = await invoke<{ url: string; loading: boolean } | null>(
            'browser_preview_status'
          )
          return status?.url === origin + '/storage/page' && !status.loading
        }, 'committed fixture')
      }
      let outcome: { failure?: string } = {}
      try {
        await open(other)
        await wait(async () => (await read(other)) === '1,1,1,1,1,1', 'other origin seeded')
        await open(current)
        await wait(async () => (await read(current)) === '1,1,1,1,1,1', 'current origin seeded')
        let refused = false
        try {
          await invoke('browser_preview_clear_site_data', { url: other + '/storage/page' })
        } catch {
          refused = true
        }
        if (!refused || (await read(current)) !== '1,1,1,1,1,1')
          throw new Error('Stale clear target was accepted')
        await invoke('browser_preview_clear_site_data', { url: current + '/storage/page' })
        await wait(
          async () => (await read(current)) === '0,0,0,0,0,0',
          'current origin cleared and reloaded'
        )
        await open(other)
        await wait(
          async () => (await read(other)).startsWith('1,1,1,1,1,'),
          'other origin retained'
        )
        if (
          store.state.sceneVersion !== before.version ||
          [...store.state.selectedIds].join(',') !== before.selected.join(',')
        )
          throw new Error('Clearing site data edits the design')
      } catch (reason) {
        outcome = { failure: String(reason) }
      } finally {
        await invoke('browser_preview_action', { action: 'close' })
      }
      done(outcome)
    },
    origins
  )
  assert.equal(result.failure, undefined)
})
