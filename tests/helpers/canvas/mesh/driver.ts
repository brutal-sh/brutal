import type { Page } from '@playwright/test'

import type { MeshGradient } from '@open-pencil/scene-graph'
import type * as Mesh from '@open-pencil/scene-graph/gradient/mesh'

export function meshDriver(page: () => Page) {
  return {
    async show(kind: 'fills' | 'strokes' = 'fills') {
      return page().evaluate(async (kind) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        const moduleURL = '/packages/scene-graph/src/gradient/mesh.ts'
        const { createMeshGradient }: typeof Mesh = await import(moduleURL)
        const paint = {
          type: 'GRADIENT_MESH' as const,
          color: { r: 0, g: 0, b: 0, a: 0 },
          opacity: 1,
          visible: true,
          meshGradient: createMeshGradient()
        }
        const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
          name: 'Mesh editing acceptance',
          width: 200,
          height: 140,
          fills: kind === 'fills' ? [paint] : [],
          strokes: kind === 'strokes' ? [{ ...paint, weight: 24, align: 'INSIDE' }] : []
        })
        store.select([node.id])
        store.state.zoom = 2
        store.state.panX = 100
        store.state.panY = 100
        store.requestRender()
        return node.id
      }, kind)
    },
    async paint(nodeId: string, kind: 'fills' | 'strokes' = 'fills'): Promise<MeshGradient | null> {
      return page().evaluate(
        ({ nodeId, kind }) =>
          window.openPencil?.getStore?.().graph.getNode(nodeId)?.[kind][0].meshGradient ?? null,
        { nodeId, kind }
      )
    },
    async bind(nodeId: string, kind: 'fills' | 'strokes') {
      return page().evaluate(
        ({ nodeId, kind }) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          const collection = store.graph.createCollection('Mesh tokens')
          const variable = store.graph.createVariable('Ink', 'COLOR', collection.id, {
            r: 0.75,
            g: 0.25,
            b: 0.5,
            a: 0.5
          })
          for (const index of [0, 4])
            store.graph.bindVariable(nodeId, `${kind}/0/meshGradient/colors/${index}`, variable.id)
          store.requestRender()
          return variable.id
        },
        { nodeId, kind }
      )
    },
    bindings(nodeId: string) {
      return page().evaluate(
        (id) => window.openPencil?.getStore?.().graph.getNode(id)?.boundVariables ?? {},
        nodeId
      )
    },
    async edit(nodeId: string) {
      return page().evaluate((nodeId) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        store.state.gradientEdit = { nodeId, paint: 'fills', index: 0, stop: 4 }
        store.requestRender()
      }, nodeId)
    }
  }
}
