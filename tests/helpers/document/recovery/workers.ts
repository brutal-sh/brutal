import { expect, type Page, type Route, type Worker } from '@playwright/test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import type * as Recovery from '@/app/document/recovery'
import { createDeferred } from '@/app/runtime/deferred'
import type * as AppTabs from '@/app/tabs'

import { openOwnedDocuments } from '#tests/helpers/automation/cli/documents'
import { CanvasHelper } from '#tests/helpers/canvas'
import { recoveryBytes } from '#tests/helpers/document/recovery'

/** Both documents stay dirty and resident while their actual compression workers run. */
export async function prepareConcurrentRecovery(page: Page, persistNow = true) {
  const ids = await openOwnedDocuments(page)
  return page.evaluate(
    async ({ ids, persistNow }) => {
      const moduleURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(moduleURL)
      const owned = ids.map((id, index) => {
        const tab = tabs.getTabById(id)
        if (!tab) throw new Error('Missing owned recovery tab')
        const width = 123 + index * 40
        const height = 76 + index * 30
        tab.store.createShape('RECTANGLE', 120, 120, width, height)
        return { tab, width, height }
      })
      if (persistNow) await Promise.all(owned.map(({ tab }) => tab.store.persistRecoveryNow()))
      return owned.map(({ tab, width, height }) => ({
        id: tab.store.getRecoveryId(),
        name: tab.store.state.documentName,
        width,
        height
      }))
    },
    { ids, persistNow }
  )
}

/** Read accepted snapshots from the runner-owned store, including their real archive bytes. */
export async function recoveryArchives(page: Page) {
  return page.evaluate(async () => {
    const moduleURL = '/src/app/document/recovery/index.ts'
    const recovery: typeof Recovery = await import(moduleURL)
    const store = recovery.getRecoveryStore()
    const rows = await store.list()
    return Promise.all(
      rows.map(async (row) => {
        const snapshot = await store.read(row.id)
        if (!snapshot) throw new Error('Accepted recovery snapshot disappeared')
        return { id: row.id, name: row.documentName, bytes: Array.from(snapshot.figBytes) }
      })
    )
  })
}

export async function restoredGeometry(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing restored editor')
    return {
      dirty: store.hasUnsavedChanges(),
      nodes: store.graph.getChildren(store.state.currentPageId).map((node) => ({
        type: node.type,
        width: node.width,
        height: node.height
      }))
    }
  })
}

export function observeRecoveryWorkers(page: Page) {
  const events: Array<{ event: string; url: string }> = []
  const active = new Set<Worker>()
  let peak = 0
  page.on('worker', (worker) => {
    const url = worker.url()
    if (!url.includes('/io/formats/fig/export/worker')) return
    active.add(worker)
    peak = Math.max(peak, active.size)
    events.push({ event: 'started', url })
    worker.on('close', () => {
      active.delete(worker)
      events.push({ event: 'closed', url })
    })
  })
  return {
    events,
    active,
    get peak() {
      return peak
    }
  }
}

/** Hold only this page's next compression-module request until its reload disposes the realm. */
export async function holdRecoveryWorker(page: Page) {
  const started = createDeferred<Route>()
  const released = createDeferred<undefined>()
  let heldRoute: Route | undefined
  const pattern = '**/io/formats/fig/export/worker*'
  const handler = async (route: Route) => {
    heldRoute = route
    started.resolve(route)
    await released.promise
  }
  await page.route(pattern, handler)
  return {
    started: started.promise,
    async release() {
      try {
        await heldRoute?.continue()
      } finally {
        released.resolve(undefined)
        await page.unroute(pattern, handler)
      }
    }
  }
}

export function beginRecoveryWrite(page: Page) {
  const result = page
    .evaluate(async () => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('Missing interrupted recovery editor')
      store.createShape('RECTANGLE', 350, 120, 42, 38)
      try {
        await store.persistRecoveryNow()
        return { status: 'fulfilled' as const }
      } catch (error) {
        return {
          status: 'rejected' as const,
          message: error instanceof Error ? error.message : String(error)
        }
      }
    })
    .then(
      (outcome) => outcome,
      (error: unknown) => ({
        status: 'rejected' as const,
        message: error instanceof Error ? error.message : String(error)
      })
    )
  return { result }
}

export async function decodeRecoveryArchive(
  archive: Awaited<ReturnType<typeof recoveryArchives>>[number]
) {
  const document = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
    name: `${archive.name}.fig`,
    data: new Uint8Array(archive.bytes)
  })
  return [...document.graph.getAllNodes()].filter((node) => node.type === 'RECTANGLE')
}

/** Retry the live editor's failed snapshot through its public persistence action. */
export function retryRecoveryWrite(page: Page) {
  return page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing retry editor')
    await store.persistRecoveryNow()
  })
}

/** Observe only owned public flush actions; automatic debounce calls the controller directly. */
export function observeRecoveryFlush(page: Page, ids: string[]) {
  return page.evaluateHandle(async (ids) => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    const calls: string[] = []
    const originals = tabs
      .getTabsSnapshot()
      .filter((tab) => ids.includes(tab.store.getRecoveryId()))
      .map(({ store }) => {
        const persist = store.persistRecoveryNow
        store.persistRecoveryNow = () => {
          calls.push(store.getRecoveryId())
          return persist()
        }
        return { store, persist }
      })
    return {
      calls: () => [...calls],
      restore() {
        for (const { store, persist } of originals) store.persistRecoveryNow = persist
      }
    }
  }, ids)
}

export async function prepareRecoveryArchives(page: Page, persistNow = true) {
  const canvas = new CanvasHelper(page)
  const workers = observeRecoveryWorkers(page)
  await page.goto('/')
  await canvas.waitForInit()
  const documents = await prepareConcurrentRecovery(page, persistNow)
  await expect.poll(() => workers.active.size).toBe(0)
  return { canvas, workers, documents, backups: await recoveryBytes(page) }
}
