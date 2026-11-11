import type { Page } from '@playwright/test'

import { parseColor } from '@open-pencil/scene-graph/color'

import { openAppMenu } from '#tests/helpers/menu'

function noteSetupDriver(page: Page) {
  return {
    origin() {
      return page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const canvas = document.querySelector('[data-test-id="canvas-element"]')
        if (!canvas) throw new Error('Canvas unavailable')
        const bounds = canvas.getBoundingClientRect()
        // Mouse events land on screen pixels even when the dock starts at a fractional CSS pixel.
        store.state.zoom = 1
        store.state.panX = 100 + Math.floor(bounds.left) - bounds.left
        store.state.panY = 100 + Math.floor(bounds.top) - bounds.top
        store.requestRender()
      })
    },
    async open(path: string) {
      const choosing = page.waitForEvent('filechooser')
      await (await openAppMenu(page, 'File')).getByRole('menuitem', { name: /^Open…/ }).click()
      await (await choosing).setFiles(path)
    },
    readOnly(value: boolean) {
      return page.evaluate((readOnly) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        store.setReadOnly(readOnly)
      }, value)
    }
  }
}

function noteSelectionDriver(page: Page) {
  return {
    selected() {
      return page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const [note] = store.getSelectedNodes()
        const body = note && store.graph.getChildren(note.id)[0]
        return {
          pageId: store.state.currentPageId,
          tool: store.state.activeTool,
          editing: store.state.editingTextId,
          note: note && {
            id: note.id,
            x: note.x,
            y: note.y,
            width: note.width,
            height: note.height,
            parentId: note.parentId,
            type: note.type,
            componentId: note.componentId,
            name: note.name,
            fill: note.fills[0]?.color,
            text: body?.text
          }
        }
      })
    },
    select(ids: string | readonly string[]) {
      return page.evaluate(
        (targets) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          store.select(targets)
          store.requestRender()
        },
        typeof ids === 'string' ? [ids] : [...ids]
      )
    }
  }
}

function noteComponentDriver(page: Page) {
  return {
    createInstance(masterId: string) {
      return page.evaluate((id) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const instance = store.createInstanceFromComponent(id, 900, 24)
        if (!instance) throw new Error('Note instance unavailable')
        return instance
      }, masterId)
    },
    createNestedInstance(masterId: string) {
      return page.evaluate((id) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const frame = store.graph.createNode('COMPONENT', store.state.currentPageId, {
          name: 'Note component container',
          width: 400,
          height: 300
        })
        const prototype = store.createInstanceFromComponent(id, 20, 20, frame.id)
        const outer = store.createInstanceFromComponent(frame.id, 1200, 24)
        const copy = outer && store.graph.getChildren(outer).at(0)
        if (!prototype || !copy) throw new Error('Nested Note unavailable')
        store.select([copy.id])
        return { prototype, copy: copy.id }
      }, masterId)
    }
  }
}

function notePaintDriver(page: Page) {
  return {
    paints(ids: readonly string[] = ['gold', 'purple', 'long']) {
      return page.evaluate(
        (targets) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          return targets.map((id) => {
            const node = store.graph.getNode(id)
            const fill = node?.fills.at(0)
            return {
              id,
              color: fill && { ...fill.color, a: fill.opacity },
              binding: node?.boundVariables['fills/0/color']
            }
          })
        },
        [...ids]
      )
    },
    bindGold() {
      return page.evaluate((color) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const collection = store.graph.createCollection('Note reference')
        const variable = store.graph.createVariable('Gold', 'COLOR', collection.id, color)
        store.graph.bindVariable('gold', 'fills/0/color', variable.id)
        store.requestRender()
        return variable.id
      }, parseColor('#FEE484'))
    }
  }
}

function noteReadDriver(page: Page) {
  return {
    geometry(ids: readonly string[]) {
      return page.evaluate(
        (targets) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          return targets.map((id) => {
            const node = store.graph.getNode(id)
            return { id, x: node?.x, y: node?.y, width: node?.width, height: node?.height }
          })
        },
        [...ids]
      )
    },
    read() {
      return page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        return ['gold', 'purple', 'long'].map((id) => {
          const note = store.graph.getNode(id)
          const body = store.graph.getChildren(id)[0]
          return { id, width: note?.width, height: note?.height, content: body?.text }
        })
      })
    }
  }
}

/** Setup and probes for imported Pen Notes; edits and saves use the app's controls. */
export function noteDriver(page: Page) {
  return {
    ...noteSetupDriver(page),
    ...noteSelectionDriver(page),
    ...noteComponentDriver(page),
    ...notePaintDriver(page),
    ...noteReadDriver(page)
  }
}
