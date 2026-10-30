import type { Page } from '@playwright/test'

/** A small editable frame at a known canvas position, with text and a visible outline. */
export function scaleDriver(page: () => Page) {
  return {
    seed() {
      return page().evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        store.state.zoom = 1
        store.state.panX = 100
        store.state.panY = 100
        const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
          name: 'Scale fixture',
          x: 100,
          y: 100,
          width: 120,
          height: 80,
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
          strokes: [
            {
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0, a: 1 },
              opacity: 1,
              visible: true,
              weight: 2,
              align: 'CENTER'
            }
          ]
        })
        store.graph.createNode('TEXT', frame.id, {
          name: 'Scale text',
          text: 'Scale me',
          x: 10,
          y: 10,
          width: 80,
          height: 25,
          fontSize: 16,
          textAutoResize: 'NONE',
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
        })
        store.select([frame.id])
        store.undo.clear()
        store.requestRender()
      })
    },
    state() {
      return page().evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const frame = store.graph
          .getChildren(store.state.currentPageId)
          .find((node) => node.name === 'Scale fixture')
        if (!frame) throw new Error('Scale fixture missing')
        const text = store.graph.getChildren(frame.id)[0]
        return {
          tool: store.state.activeTool,
          width: frame.width,
          height: frame.height,
          stroke: frame.strokes[0].weight,
          fontSize: text.fontSize,
          textX: text.x,
          textY: text.y,
          canUndo: store.undo.canUndo
        }
      })
    }
  }
}
