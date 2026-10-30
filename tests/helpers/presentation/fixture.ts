import type { Page } from '@playwright/test'

/** Fixture: top-level frames with distinct paint, plus layers that must not become slides. */
export function seedPresentation(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const pageId = store.state.currentPageId
    const end = store.graph.createNode('FRAME', pageId, {
      name: 'Closing',
      width: 640,
      height: 360,
      x: 800,
      y: 100,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    store.graph.createNode('FRAME', end.id, { name: 'Nested frame', width: 30, height: 30 })
    store.graph.createNode('FRAME', pageId, { name: 'Hidden frame', visible: false })
    store.graph.createNode('RECTANGLE', pageId, { name: 'Decoration' })
    store.graph.createNode('FRAME', pageId, {
      name: 'Opening',
      width: 640,
      height: 360,
      x: 100,
      y: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    store.select([end.id])
    store.requestRender()
  })
}

/** Probe: presentation must preserve selection, page, viewport and document content. */
export function editorSnapshot(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    return {
      selection: [...store.state.selectedIds],
      page: store.state.currentPageId,
      zoom: store.state.zoom,
      panX: store.state.panX,
      panY: store.state.panY,
      nodes: store.graph.getChildren(store.state.currentPageId).map((node) => ({ ...node }))
    }
  })
}
