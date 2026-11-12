import type { SceneGraph } from '@open-pencil/scene-graph'
import { computeBounds } from '@open-pencil/scene-graph/geometry'
import type { Rect, Vector } from '@open-pencil/scene-graph/primitives'

import { FigmaNodeProxy, INTERNAL_ID, type NodeProxyHost } from './proxy'

/** The page, selection, proxy identities and view belonging to one API instance. */
export class FigmaDocumentState {
  currentPageId: string
  private _selection: FigmaNodeProxy[] = []
  private _nodeCache = new Map<string, FigmaNodeProxy>()
  private _pageProxies = new WeakSet<FigmaNodeProxy>()

  constructor(
    private readonly graph: SceneGraph,
    private readonly host: NodeProxyHost,
    private readonly viewportSize: () => { width: number; height: number }
  ) {
    const pages = graph.getPages()
    this.currentPageId = pages[0]?.id ?? graph.rootId
  }

  wrapNode(id: string): FigmaNodeProxy {
    let proxy = this._nodeCache.get(id)
    if (!proxy) {
      proxy = new FigmaNodeProxy(id, this.graph, this.host)
      this._nodeCache.set(id, proxy)
    }
    return proxy
  }

  private ensurePageProxy(proxy: FigmaNodeProxy): FigmaNodeProxy & { selection: FigmaNodeProxy[] } {
    if (!this._pageProxies.has(proxy)) {
      Object.defineProperty(proxy, 'selection', {
        get: () => this._selection,
        set: (nodes: FigmaNodeProxy[]) => {
          this._selection = nodes
        },
        enumerable: true,
        configurable: true
      })
      this._pageProxies.add(proxy)
    }
    return proxy as FigmaNodeProxy & { selection: FigmaNodeProxy[] }
  }

  get currentPage(): FigmaNodeProxy & { selection: FigmaNodeProxy[] } {
    return this.ensurePageProxy(this.host.wrapNode(this.currentPageId))
  }

  set currentPage(page: FigmaNodeProxy) {
    this.currentPageId = page[INTERNAL_ID]
  }

  private _viewport = { x: 0, y: 0, zoom: 1 }

  get viewport(): {
    center: Vector
    zoom: number
    scrollAndZoomIntoView: (nodes: readonly { absoluteBoundingBox: Rect }[]) => void
  } {
    return {
      center: { x: this._viewport.x, y: this._viewport.y },
      zoom: this._viewport.zoom,
      scrollAndZoomIntoView: (nodes) => {
        const b = computeBounds(nodes.map((n) => n.absoluteBoundingBox))
        if (b.width === 0 && b.height === 0 && nodes.length === 0) return

        const padding = 80
        const contentW = b.width + padding * 2
        const contentH = b.height + padding * 2
        const { width: viewW, height: viewH } = this.viewportSize()
        const zoom = Math.min(viewW / contentW, viewH / contentH, 1)
        this._viewport = { x: b.x + b.width / 2, y: b.y + b.height / 2, zoom }
      }
    }
  }

  set viewport(v: { center: Vector; zoom: number }) {
    this._viewport = { x: v.center.x, y: v.center.y, zoom: v.zoom }
  }
}
