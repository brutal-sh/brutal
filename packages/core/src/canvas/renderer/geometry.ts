import type { SceneNode } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas/renderer'

export const rendererGeometryMethods = {
  color4f(r: number, g: number, b: number, a: number): Float32Array {
    const c = this._tmpColor
    c[0] = r
    c[1] = g
    c[2] = b
    c[3] = a
    return c
  },

  ltrb(l: number, t: number, r: number, b: number): Float32Array {
    const rc = this._tmpRect
    rc[0] = l
    rc[1] = t
    rc[2] = r
    rc[3] = b
    return rc
  },

  isRectangularType(type: string): boolean {
    return (
      type === 'FRAME' ||
      type === 'RECTANGLE' ||
      type === 'ROUNDED_RECTANGLE' ||
      type === 'COMPONENT' ||
      type === 'INSTANCE' ||
      type === 'SECTION' ||
      type === 'GROUP'
    )
  },

  effectOverflow(node: SceneNode): number {
    let expand = 0
    for (const e of node.effects) {
      if (!e.visible) continue
      const blur = e.radius
      const spread = e.spread
      const ox = Math.abs(e.offset.x)
      const oy = Math.abs(e.offset.y)
      expand = Math.max(expand, blur + spread + ox, blur + spread + oy)
    }
    return expand
  },

  screenToCanvas(sx: number, sy: number): Vector {
    return {
      x: (sx - this.panX) / this.zoom,
      y: (sy - this.panY) / this.zoom
    }
  }
} satisfies ThisType<SkiaRenderer>
