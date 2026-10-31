import type { Page } from '@playwright/test'

import type * as Shaders from '@open-pencil/scene-graph/shaders'

/** Read the selected shader and its real, current rendered still frame. */
export function shaderDriver(page: () => Page) {
  return {
    replaceSource(nodeId: string, url: string, source: string) {
      return page().evaluate(
        async ({ nodeId, url, source }) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          const moduleURL = '/packages/scene-graph/src/shaders/index.ts'
          const shaders: typeof Shaders = await import(moduleURL)
          store.setShaderPaint(
            [nodeId],
            'fills',
            0,
            shaders.fragmentShaderPreset({ url, source, uniforms: {} })
          )
        },
        { nodeId, url, source }
      )
    },
    resetViewport() {
      return page().evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Editor unavailable')
        store.setZoomAroundPoint(1, 0, 0)
        store.pan(-store.state.panX, -store.state.panY)
      })
    },
    resize(nodeId: string, width: number, height: number) {
      return page().evaluate(
        ({ nodeId, width, height }) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Editor unavailable')
          store.graph.updateNode(nodeId, { width, height })
          store.requestRender()
        },
        { nodeId, width, height }
      )
    },
    livePixel(nodeId: string) {
      return page().evaluate((nodeId) => {
        const store = window.openPencil?.getStore?.()
        const hash = store?.graph.getNode(nodeId)?.fills[0].imageHash
        const renderer = store?.canvasRenderers.find(
          (candidate) => hash && candidate.liveImages.has(hash)
        )
        const live = hash ? renderer?.liveImages.get(hash) : null
        if (!renderer || !live) return null
        const bytes = live.image.readPixels(0, 0, {
          width: 1,
          height: 1,
          colorType: renderer.ck.ColorType.RGBA_8888,
          alphaType: renderer.ck.AlphaType.Unpremul,
          colorSpace: renderer.ck.ColorSpace.SRGB
        })
        return bytes ? [...bytes] : null
      }, nodeId)
    },
    read(kind: 'fills' | 'strokes' = 'fills', targetId?: string) {
      return page().evaluate(
        async ({ kind, targetId }) => {
          const store = window.openPencil?.getStore?.()
          const nodeId = targetId ?? (store && [...store.state.selectedIds][0])
          const node = nodeId ? store?.graph.getNode(nodeId) : null
          if (!store || !node) throw new Error('Select a shader layer first')
          const moduleURL = '/packages/scene-graph/src/shaders/index.ts'
          const shaders: typeof Shaders = await import(moduleURL)
          const entry = shaders.shaderOfPaint(node, node[kind][0])
          if (!entry) return null
          const fragment = shaders.fragmentShaderOf(entry.preset)
          const bytes = store.graph.images.get(entry.image)
          if (!bytes || !shaders.isShaderFrameCurrent(entry, node))
            return { fragment, pixels: null }
          const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
          try {
            const canvas = document.createElement('canvas')
            canvas.width = bitmap.width
            canvas.height = bitmap.height
            const context = canvas.getContext('2d')
            if (!context) throw new Error('Cannot read rendered shader pixels')
            context.drawImage(bitmap, 0, 0)
            return {
              fragment,
              logicalSize: { width: node.width, height: node.height },
              pixels: [
                [4, 4],
                [56, 4],
                [4, 56]
              ].map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]),
              width: bitmap.width,
              height: bitmap.height
            }
          } finally {
            bitmap.close()
          }
        },
        { kind, targetId }
      )
    }
  }
}
