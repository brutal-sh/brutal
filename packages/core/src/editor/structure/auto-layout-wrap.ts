import { pick } from 'es-toolkit'

import type { LayoutMode, SceneNode } from '@open-pencil/scene-graph'
import { getAxisAlignedBoundsInParent } from '@open-pencil/scene-graph/coordinate'
import { authoredLayoutSizing, authoredLayoutSizingUpdates } from '@open-pencil/scene-graph/layout'
import type { Rect } from '@open-pencil/scene-graph/primitives'

import { wrapParentId } from '#core/editor/structure/container-wrap'
import { nextNumberedName } from '#core/editor/structure/rename'
import type { EditorContext } from '#core/editor/types'
import { computeLayout } from '#core/layout'

/** The place and size of each layer and everything inside it, which the new layout can change. */
function captureGeometry(ctx: EditorContext, nodes: SceneNode[]): Map<string, Rect> {
  const geometry = new Map<string, Rect>()
  const visit = (node: SceneNode) => {
    geometry.set(node.id, { x: node.x, y: node.y, width: node.width, height: node.height })
    for (const child of ctx.graph.getChildren(node.id)) visit(child)
  }
  for (const node of nodes) visit(node)
  return geometry
}

/**
 * Wrap sibling layers in a new auto layout frame; returns the frame, or null if they are not
 * siblings. The frame takes the slot of the topmost selected layer, as Figma places a new group,
 * and undo puts every layer back in its old slot, place, and size. `preserveSpacing` infers a
 * flow from the layers' positions and retains their average gap. Matching cross-axis bounds
 * become Fill children in a fixed cross axis; other selections hug both axes.
 */
export function wrapInAutoLayout(
  ctx: EditorContext,
  selectedNodes: SceneNode[],
  preserveSpacing = false
): string | null {
  const wrapParent = wrapParentId(ctx, selectedNodes)
  const parent = wrapParent ? ctx.graph.getNode(wrapParent) : undefined
  if (!parent) return null
  const parentId = parent.id

  const prevSelection = new Set(ctx.state.selectedIds)
  const order = [...parent.childIds]
  const geometry = captureGeometry(ctx, selectedNodes)
  const sizing = new Map(
    (preserveSpacing ? selectedNodes : []).map(
      (node) =>
        [
          node.id,
          structuredClone(
            pick(node, [
              'layoutGrow',
              'layoutAlignSelf',
              'primaryAxisSizing',
              'counterAxisSizing',
              'textAutoResize',
              'pluginData'
            ])
          )
        ] as const
    )
  )
  const bounds = getAxisAlignedBoundsInParent(selectedNodes, parentId, ctx.graph)
  const rects = selectedNodes.map((node) => ({
    id: node.id,
    ...getAxisAlignedBoundsInParent([node], parentId, ctx.graph)
  }))
  const horizontalSpread = Math.max(...rects.map((r) => r.x)) - Math.min(...rects.map((r) => r.x))
  const verticalSpread = Math.max(...rects.map((r) => r.y)) - Math.min(...rects.map((r) => r.y))
  const vertical = preserveSpacing
    ? horizontalSpread <= verticalSpread
    : selectedNodes.length <= 1 || bounds.height > bounds.width
  const direction: LayoutMode = vertical ? 'VERTICAL' : 'HORIZONTAL'
  const horizontal = direction === 'HORIZONTAL'
  const fillsCross =
    preserveSpacing &&
    rects.every((r) =>
      horizontal
        ? Math.abs(r.y - bounds.y) < 0.001 && Math.abs(r.height - bounds.height) < 0.001
        : Math.abs(r.x - bounds.x) < 0.001 && Math.abs(r.width - bounds.width) < 0.001
    )
  const occupied = rects.reduce((sum, r) => sum + (horizontal ? r.width : r.height), 0)
  const gap =
    preserveSpacing && rects.length > 1
      ? Math.max(0, ((horizontal ? bounds.width : bounds.height) - occupied) / (rects.length - 1))
      : 0
  const frameFields: Partial<SceneNode> = {
    name: preserveSpacing ? nextNumberedName(ctx.graph, parentId, 'Frame') : 'Frame',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    layoutMode: direction,
    primaryAxisSizing: 'HUG',
    counterAxisSizing: fillsCross ? 'FIXED' : 'HUG',
    itemSpacing: gap,
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    fills: []
  }
  // In reading order inside the new frame.
  const sortedIds = preserveSpacing
    ? rects
        .toSorted((a, b) => (horizontal ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x))
        .map((r) => r.id)
    : selectedNodes
        .map((n) => ({ id: n.id, pos: ctx.graph.getAbsolutePosition(n.id) }))
        .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x)
        .map((n) => n.id)
  // Just above the topmost selected layer, before the selected layers move into the frame.
  const slot = Math.max(...selectedNodes.map((n) => order.indexOf(n.id))) + 1

  function wrap(frameId?: string): string {
    const frame = ctx.graph.createNode('FRAME', parentId, {
      ...frameFields,
      ...(frameId ? { id: frameId } : {})
    })
    ctx.graph.insertChildAt(frame.id, parentId, slot)
    for (const id of sortedIds) {
      ctx.graph.reparentNode(id, frame.id)
      const node = ctx.graph.getNode(id)
      const crossAxis = horizontal ? 'VERTICAL' : 'HORIZONTAL'
      if (
        preserveSpacing &&
        node &&
        (fillsCross || authoredLayoutSizing(ctx.graph, node, crossAxis) === 'FILL')
      )
        ctx.graph.updateNode(
          id,
          authoredLayoutSizingUpdates(ctx.graph, node, crossAxis, fillsCross ? 'FILL' : 'FIXED')
        )
    }
    computeLayout(ctx.graph, frame.id)
    ctx.runLayoutForNode(frame.id)
    ctx.setSelectedIds(new Set([frame.id]))
    return frame.id
  }

  const frameId = wrap()
  ctx.undo.push({
    label: 'Wrap in auto layout',
    forward: () => {
      wrap(frameId)
    },
    inverse: () => {
      for (const id of sortedIds) ctx.graph.reparentNode(id, parentId)
      ctx.graph.deleteNode(frameId)
      order.forEach((id, index) => ctx.graph.insertChildAt(id, parentId, index))
      for (const [id, fields] of sizing) ctx.graph.updateNode(id, fields)
      for (const [id, rect] of geometry) ctx.graph.updateNode(id, rect)
      ctx.runLayoutForNode(parentId)
      ctx.setSelectedIds(preserveSpacing ? new Set() : prevSelection)
    }
  })
  return frameId
}
