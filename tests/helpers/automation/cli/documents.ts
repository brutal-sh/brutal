import type { Page } from '@playwright/test'

import type * as AppTabs from '@/app/tabs'

/** FIG retains page IDs so a replacement-renderer test exercises possible ID reuse. */
export async function openOwnedBinaryDocument(page: Page, bytes: number[], name: string) {
  return page.evaluate(
    async ({ bytes, name }) => {
      const moduleURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(moduleURL)
      const store = await tabs.openFileInNewTab(new File([new Uint8Array(bytes)], name))
      const tab = tabs.getTabForStore(store)
      if (!tab) throw new Error('Owned document unavailable')
      return { id: tab.id, pageId: store.state.currentPageId }
    },
    { bytes, name }
  )
}

/** Two synthetic files in a fresh browser context; the second remains active. */
export async function openOwnedDocuments(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    const ids: string[] = []
    for (const suffix of ['a', 'b']) {
      const input = JSON.stringify({
        version: '2.22',
        children: [
          {
            id: `owned-${suffix}`,
            type: 'rectangle',
            name: `Owned ${suffix}`,
            x: 10,
            y: 20,
            width: 64,
            height: 64,
            fill: '#336699'
          }
        ]
      })
      const store = await tabs.openFileInNewTab(
        new File([input], `CLI Owned ${suffix} ${crypto.randomUUID()}.pen`)
      )
      const tab = tabs.getTabForStore(store)
      if (!tab) throw new Error('Owned document unavailable')
      ids.push(tab.id)
    }
    return ids
  })
}

export async function documentSnapshot(page: Page, id: string): Promise<string> {
  return page.evaluate(async (id) => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    const tab = tabs.getTabById(id)
    if (!tab) throw new Error('Owned document unavailable')
    return JSON.stringify([...tab.store.graph.getAllNodes()])
  }, id)
}

export async function documentNodeX(page: Page, id: string, nodeId: string) {
  return page.evaluate(
    async ({ id, nodeId }) => {
      const moduleURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(moduleURL)
      return tabs.getTabById(id)?.store.graph.getNode(nodeId)?.x
    },
    { id, nodeId }
  )
}

export async function documentReadState(page: Page, id: string) {
  return page.evaluate(async (id) => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    const tab = tabs.getTabById(id)
    if (!tab) throw new Error('Owned document unavailable')
    return {
      dirty: tab.store.hasUnsavedChanges(),
      canUndo: tab.store.undo.canUndo,
      canRedo: tab.store.undo.canRedo,
      selection: [...tab.store.state.selectedIds],
      page: tab.store.state.currentPageId
    }
  }, id)
}

export async function documentNamedCount(page: Page, id: string, name: string) {
  return page.evaluate(
    async ({ id, name }) => {
      const moduleURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(moduleURL)
      const tab = tabs.getTabById(id)
      if (!tab) throw new Error('Owned document unavailable')
      return [...tab.store.graph.getAllNodes()].filter((node) => node.name === name).length
    },
    { id, name }
  )
}

export async function activateOwnedDocument(page: Page, id: string) {
  await page.evaluate(async (id) => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    if (!tabs.getTabById(id)) throw new Error('Owned document unavailable')
    await tabs.switchTab(id)
  }, id)
}

export async function ownedRendererReady(page: Page, id: string) {
  return page.evaluate(async (id) => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    return Boolean(tabs.getTabById(id)?.store.renderer)
  }, id)
}

export async function switchToNewOwnedPage(page: Page, id: string) {
  return page.evaluate(async (id) => {
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    const tab = tabs.getTabById(id)
    if (!tab) throw new Error('Owned document unavailable')
    const original = tab.store.state.currentPageId
    const other = tab.store.graph.addPage('Other owned page')
    tabs.switchTab(id)
    await tab.store.switchPage(other.id)
    return { original, other: other.id }
  }, id)
}

export async function pageChildNames(page: Page, document: string, id: string) {
  return page.evaluate(
    async ({ document, id }) => {
      const moduleURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(moduleURL)
      const graph = tabs.getTabById(document)?.store.graph
      if (!graph) throw new Error('Owned document unavailable')
      return graph.getChildren(id).map((node) => node.name)
    },
    { document, id }
  )
}
