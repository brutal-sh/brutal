import type { FontVariation } from '@open-pencil/scene-graph'
import { parseFontStyle } from '@open-pencil/scene-graph/font-style'

import {
  fontAxes,
  namedInstances,
  namedInstanceVariations,
  type FontAxis,
  type NamedInstance
} from './variation'
export class FontMetadata {
  private instanceVariations = new WeakMap<ArrayBuffer, Map<string, FontVariation[] | null>>()
  private variations = new WeakMap<
    ArrayBuffer,
    { axes: FontAxis[]; instances: NamedInstance[] } | null
  >()

  /**
   * The variation axes and named instances of a family's variable font, from a face it has loaded,
   * in the slant asked for where it has one: `null` when the faces it has loaded are static,
   * `undefined` when it has loaded none.
   */
  forFamily(
    family: string,
    loadedFamilies: ReadonlyMap<string, ArrayBuffer>,
    italic?: boolean
  ): { data: ArrayBuffer; axes: FontAxis[]; instances: NamedInstance[] } | null | undefined {
    let loaded = false
    let other: { data: ArrayBuffer; axes: FontAxis[]; instances: NamedInstance[] } | null = null
    for (const [key, data] of loadedFamilies) {
      if (!key.startsWith(`${family}|`)) continue
      loaded = true
      let variation = this.variations.get(data)
      if (variation === undefined) {
        const axes = fontAxes(data)
        variation = axes ? { axes, instances: namedInstances(data) } : null
        this.variations.set(data, variation)
      }
      if (!variation) continue
      const slant = parseFontStyle(key.slice(family.length + 1)).italic
      if (italic === undefined || slant === italic) return { data, ...variation }
      other ??= { data, ...variation }
    }
    return loaded ? other : undefined
  }

  /** Axis coordinates for `style` when the loaded face is a variable font, otherwise `null`. */
  namedInstanceVariations(data: ArrayBuffer, style: string): FontVariation[] | null {
    let byStyle = this.instanceVariations.get(data)
    if (!byStyle) {
      byStyle = new Map()
      this.instanceVariations.set(data, byStyle)
    }
    if (!byStyle.has(style)) byStyle.set(style, namedInstanceVariations(data, style))
    return byStyle.get(style) ?? null
  }
}
