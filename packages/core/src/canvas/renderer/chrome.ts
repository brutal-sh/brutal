import { isEqual } from 'es-toolkit'

import type { SceneNode, SceneGraph } from '@open-pencil/scene-graph'
import { slotPropertyId } from '@open-pencil/scene-graph/slots'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { initializeSelectionPaintColors } from '#core/canvas/renderer/paints'
import type { SelectionTheme } from '#core/canvas/renderer/types'
import { COMPONENT_COLOR, DEFAULT_SELECTION_THEME, SLOT_COLOR } from '#core/constants'

export const rendererChromeMethods = {
  selColor(alpha = 1) {
    const { r, g, b } = this.selectionTheme.color
    return this.ck.Color4f(r, g, b, alpha)
  },

  selForegroundColor() {
    const { r, g, b } = this.selectionTheme.foreground
    return this.ck.Color4f(r, g, b, 1)
  },

  /** Switches selection chrome to `theme`, repainting the paints that keep it between frames. */
  setSelectionTheme(theme: SelectionTheme = DEFAULT_SELECTION_THEME): void {
    if (isEqual(theme, this.selectionTheme)) return
    this.selectionTheme = { color: { ...theme.color }, foreground: { ...theme.foreground } }
    initializeSelectionPaintColors(this)
  },

  compColor(alpha = 1) {
    return this.ck.Color4f(COMPONENT_COLOR.r, COMPONENT_COLOR.g, COMPONENT_COLOR.b, alpha)
  },

  slotColor(alpha = 1) {
    return this.ck.Color4f(SLOT_COLOR.r, SLOT_COLOR.g, SLOT_COLOR.b, alpha)
  },

  /**
   * The outline colour for a node: pink for slots, purple for components, instances and every
   * layer inside them, as in Figma, blue otherwise.
   */
  outlineColor(node: SceneNode, graph: SceneGraph) {
    if (slotPropertyId(node)) return this.slotColor()
    return this.isInComponent(node, graph) ? this.compColor() : this.selColor()
  },

  /** Text drawn on {@link outlineColor}: white on slot and component colors, else the selection foreground. */
  outlineForegroundColor(node: SceneNode, graph: SceneGraph) {
    if (slotPropertyId(node) || this.isInComponent(node, graph)) return this.ck.WHITE
    return this.selForegroundColor()
  },

  /** A component, instance or set, or a layer inside one; content placed in a slot is not. */
  isInComponent(node: SceneNode, graph: SceneGraph): boolean {
    const owner = graph.closest(
      node.id,
      (layer) => this.isComponentType(layer.type) || slotPropertyId(layer) !== undefined
    )
    return owner !== undefined && !slotPropertyId(owner)
  },

  isComponentType(type: string): boolean {
    return type === 'COMPONENT' || type === 'COMPONENT_SET' || type === 'INSTANCE'
  }
} satisfies ThisType<SkiaRenderer>
