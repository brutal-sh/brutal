import { strict as assert } from 'node:assert'
import { createServer } from 'node:http'

import * as v from 'valibot'

import type { PreviewStatus } from '@/app/browser-preview/schema'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

import { observeNativeDriverCompanion } from './companion'
import {
  readNativeDriverCanvasEnabled,
  readNativeDriverHandles,
  refuseNativeDriverWindow
} from './protocol'

const snapshotSchema = v.object({ realm: v.number(), scene: v.number() })
const childSchema = v.object({
  failure: v.optional(v.string()),
  before: snapshotSchema,
  after: snapshotSchema,
  loaded: v.boolean(),
  editorAlive: v.boolean()
})

async function createChildFixture() {
  let ready = false
  let released = false
  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url === '/ready') ready = true
    if (request.url === '/released') response.end(String(released))
    else {
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><title>Native driver child</title><body>Loaded</body>')
    }
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No native fixture address')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    ready: () => ready,
    release: () => {
      released = true
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      })
  }
}

async function holdChild(origin: string): Promise<unknown> {
  return browser.executeAsync<unknown, [string]>(async (origin, done) => {
    const invoke = window.__TAURI__?.core.invoke
    const store = window.openPencil?.getStore?.()
    if (!invoke || !store) return done({ failure: 'Native editor unavailable' })
    const before = { realm: performance.timeOrigin, scene: store.state.sceneVersion }
    let loaded = false
    let failure: string | undefined
    const wait = async (check: () => Promise<boolean>) => {
      const end = Date.now() + 15000
      while (!(await check())) {
        if (Date.now() > end) throw new Error('Native child phase timed out')
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 30)
        })
      }
    }
    try {
      const width = Math.min(300, innerWidth - 60)
      const height = Math.min(300, innerHeight - 120)
      const bounds = { x: 30, y: 80, width, height }
      await invoke('browser_preview_open', { url: origin + '/page', zoom: 1, bounds })
      await wait(async () => {
        const status = await invoke<PreviewStatus | null>('browser_preview_status')
        return status?.url === origin + '/page' && !status.loading
      })
      loaded = true
      await fetch(origin + '/ready')
      await wait(async () => (await (await fetch(origin + '/released')).text()) === 'true')
    } catch (error) {
      failure = String(error)
    } finally {
      await invoke('browser_preview_action', { action: 'close' }).catch((error: unknown) => {
        failure = [failure, String(error)].filter((value) => value !== undefined).join('; ')
      })
      done({
        failure,
        before,
        after: { realm: performance.timeOrigin, scene: store.state.sceneVersion },
        loaded,
        editorAlive: !!window.openPencil?.getStore?.() && !!document.querySelector('canvas')
      })
    }
  }, origin)
}

async function waitForChild(ready: () => boolean, completed: () => boolean) {
  const end = Date.now() + 20000
  while (!ready() && !completed() && Date.now() < end)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 30)
    })
  if (!ready()) throw new Error('Native child did not reach the loaded phase')
}

async function readDuringChild() {
  return {
    during: await readNativeDriverHandles(),
    enabled: await readNativeDriverCanvasEnabled(),
    childError: await refuseNativeDriverWindow('browser-preview'),
    missingError: await refuseNativeDriverWindow('missing-native-driver-window'),
    companion: await observeNativeDriverCompanion()
  }
}

function validateChild(value: unknown) {
  const parsed = v.safeParse(childSchema, value)
  if (!parsed.success) throw new Error('Invalid native child observation')
  if (parsed.output.failure) throw new Error(parsed.output.failure)
  if (
    !parsed.output.loaded ||
    !parsed.output.editorAlive ||
    parsed.output.before.realm !== parsed.output.after.realm ||
    parsed.output.before.scene !== parsed.output.after.scene
  )
    throw new Error('Native child changed or lost the editor')
}

export async function observeNativeDriverChild() {
  await createNativeLayerFixture()
  const fixture = await createChildFixture()
  const failures: unknown[] = []
  let result: Awaited<ReturnType<typeof readDuringChild>> | undefined
  let before: string[] = []
  try {
    before = await readNativeDriverHandles()
    let completed = false
    const running = holdChild(fixture.origin).finally(() => {
      completed = true
    })
    // Observe the rejection immediately while the node-side checks run.
    const outcome = running.then(
      (value) => ({ value }),
      (error: unknown) => ({ error })
    )
    try {
      await waitForChild(fixture.ready, () => completed)
      result = await readDuringChild()
    } catch (error) {
      failures.push(error)
    } finally {
      fixture.release()
      const child = await outcome
      if ('error' in child) failures.push(child.error)
      else {
        try {
          validateChild(child.value)
        } catch (error) {
          failures.push(error)
        }
      }
    }
  } catch (error) {
    failures.push(error)
  } finally {
    try {
      await fixture.close()
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1) throw new AggregateError(failures, 'Native child observation failed')
  assert.ok(result)
  return { before, ...result }
}
