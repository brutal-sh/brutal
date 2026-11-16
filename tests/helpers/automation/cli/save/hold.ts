import type { Page } from '@playwright/test'
import * as v from 'valibot'

import type * as Deferred from '@/app/runtime/deferred'
import type * as AppTabs from '@/app/tabs'

const saveFrameSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.variant('type', [
    v.object({ type: v.literal('request'), id: v.string(), command: v.literal('save_uri') }),
    v.object({ type: v.literal('cancel'), id: v.string() })
  ])
)

/** Observe only owned Save/cancel frames, retaining no credentials. */
export function observeSaveRequests(page: Page) {
  const requests: string[] = []
  const cancelled = new Set<string>()
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).port !== (process.env.OPENPENCIL_TEST_MCP_PORT ?? '7600')) return
    socket.on('framereceived', ({ payload }) => {
      const result = v.safeParse(saveFrameSchema, payload)
      if (!result.success) return
      if (result.output.type === 'cancel') cancelled.add(result.output.id)
      else requests.push(result.output.id)
    })
  })
  return { requests, cancelled }
}

/** Hold encoded bytes at the existing copy writer, with explicit restoration and drain. */
export async function holdOwnedSaveWrite(page: Page, document: string) {
  return page.evaluateHandle(async (document) => {
    const tabsURL = '/src/app/tabs/index.ts'
    const deferredURL = '/src/app/runtime/deferred.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const deferred: typeof Deferred = await import(deferredURL)
    const store = tabs.getTabById(document)?.store
    if (!store) throw new Error('Missing owned Save document')
    const original = store.saveFigFileCopy
    const entered = deferred.createDeferred<undefined>()
    const held = deferred.createDeferred<undefined>()
    let pending: Promise<boolean> | undefined
    store.saveFigFileCopy = (write, name) => {
      pending = original(async (data) => {
        entered.resolve(undefined)
        await held.promise
        return write(data)
      }, name)
      return pending
    }
    return {
      entered: () => entered.promise,
      async release() {
        held.resolve(undefined)
        return pending?.then(() => 'saved', String)
      },
      restore: () => {
        held.resolve(undefined)
        store.saveFigFileCopy = original
      }
    }
  }, document)
}

export async function changeOwnedSaveTarget(
  page: Page,
  document: string,
  change: 'read-only' | 'source'
) {
  await page.evaluate(
    async ({ document, change }) => {
      const tabsURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(tabsURL)
      const store = tabs.getTabById(document)?.store
      if (!store) throw new Error('Missing owned Save target')
      if (change === 'read-only') store.setReadOnly(true)
      else
        store.setDocumentSource(
          'replacement.pen',
          'pen',
          undefined,
          `${store.getDocumentFilePath()}.replacement.pen`
        )
    },
    { document, change }
  )
}
