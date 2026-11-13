import { pick } from 'es-toolkit'

import type { LayoutMode, SceneNode } from '@open-pencil/scene-graph'
import { getAxisAlignedBoundsInParent } from '@open-pencil/scene-graph/coordinate'
import { authoredLayoutSizing, authoredLayoutSizingUpdates } from '@open-pencil/scene-graph/layout'
import type { Rect } from '@open-pencil/scene-graph/primitives'

import { wrapParentId } from '#core/editor/structure/container-wrap'
import { nextNumberedName } from '#core/editor/structure/rename'
import type { EditorContext } from '#core/editor/types'
import { computeLayout } from '#core/layout'

type WrapRect = Rect & { id: string }
type WrapGeometry = {
  bounds: Rect
  rects: WrapRect[]
  direction: LayoutMode
  fillsCross: boolean
  gap: number
  primaryExtent: number
}
type WrapPlan = {
  parentId: string
  preserveSpacing: boolean
  geometry: WrapGeometry
  before: ReturnType<typeof captureBefore>
  frameFields: Partial<SceneNode>
  sortedIds: string[]
  slot: number
}

/** The place and size of each layer and everything inside it, which layout can change. */
function captureGeometry(ctx: EditorContext, nodes: SceneNode[]): Map<string, Rect> {
  const geometry = new Map<string, Rect>()
  const visit = (node: SceneNode) => {
    geometry.set(node.id, { x: node.x, y: node.y, width: node.width, height: node.height })
    for (const child of ctx.graph.getChildren(node.id)) visit(child)
  }
  for (const node of nodes) visit(node)
  return geometry
}

function captureBefore(
  ctx: EditorContext,
  nodes: SceneNode[],
  parent: SceneNode,
  preserveSpacing: boolean
) {
  return {
    selection: new Set(ctx.state.selectedIds),
    order: [...parent.childIds],
    geometry: captureGeometry(ctx, nodes),
    sizing: new Map(
      (preserveSpacing ? nodes : []).map(
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
  }
}

function flowDirection(rects: WrapRect[], bounds: Rect, preserveSpacing: boolean): LayoutMode {
  const horizontalSpread = Math.max(...rects.map((r) => r.x)) - Math.min(...rects.map((r) => r.x))
  const verticalSpread = Math.max(...rects.map((r) => r.y)) - Math.min(...rects.map((r) => r.y))
  const vertical = preserveSpacing
    ? horizontalSpread <= verticalSpread
    : rects.length <= 1 || bounds.height > bounds.width
  return vertical ? 'VERTICAL' : 'HORIZONTAL'
}

function measureWrap(
  ctx: EditorContext,
  nodes: SceneNode[],
  parentId: string,
  preserveSpacing: boolean
): WrapGeometry {
  const bounds = getAxisAlignedBoundsInParent(nodes, parentId, ctx.graph)
  const rects = nodes.map((node) => ({
    id: node.id,
    ...getAxisAlignedBoundsInParent([node], parentId, ctx.graph)
  }))
  const direction = flowDirection(rects, bounds, preserveSpacing)
  const horizontal = direction === 'HORIZONTAL'
  const fillsCross =
    preserveSpacing &&
    rects.every((r) =>
      horizontal
        ? Math.abs(r.y - bounds.y) < 0.001 && Math.abs(r.height - bounds.height) < 0.001
        : Math.abs(r.x - bounds.x) < 0.001 && Math.abs(r.width - bounds.width) < 0.001
    )
  const occupied = rects.reduce((sum, r) => sum + (horizontal ? r.width : r.height), 0)
  const intervals = Math.max(0, rects.length - 1)
  const gap =
    preserveSpacing && intervals > 0
      ? Math.max(0, ((horizontal ? bounds.width : bounds.height) - occupied) / intervals)
      : 0
  return { bounds, rects, direction, fillsCross, gap, primaryExtent: occupied + gap * intervals }
}

function readingOrder(
  ctx: EditorContext,
  nodes: SceneNode[],
  geometry: WrapGeometry,
  preserveSpacing: boolean
): string[] {
  if (preserveSpacing) {
    const horizontal = geometry.direction === 'HORIZONTAL'
    return geometry.rects
      .toSorted((a, b) => (horizontal ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x))
      .map((r) => r.id)
  }
  return nodes
    .map((node) => ({ id: node.id, pos: ctx.graph.getAbsolutePosition(node.id) }))
    .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x)
    .map((node) => node.id)
}

function createWrapPlan(
  ctx: EditorContext,
  nodes: SceneNode[],
  parent: SceneNode,
  preserveSpacing: boolean
): WrapPlan {
  const before = captureBefore(ctx, nodes, parent, preserveSpacing)
  const geometry = measureWrap(ctx, nodes, parent.id, preserveSpacing)
  return {
    parentId: parent.id,
    preserveSpacing,
    geometry,
    before,
    frameFields: {
      name: preserveSpacing ? nextNumberedName(ctx.graph, parent.id, 'Frame') : 'Frame',
      ...geometry.bounds,
      layoutMode: geometry.direction,
      primaryAxisSizing: 'HUG',
      counterAxisSizing: geometry.fillsCross ? 'FIXED' : 'HUG',
      itemSpacing: geometry.gap,
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      fills: []
    },
    sortedIds: readingOrder(ctx, nodes, geometry, preserveSpacing),
    slot: Math.max(...nodes.map((node) => before.order.indexOf(node.id))) + 1
  }
}

function reflowContainingLayouts(ctx: EditorContext, parentId: string): void {
  let parent = ctx.graph.getNode(parentId)
  while (parent) {
    computeLayout(ctx.graph, parent.id)
    parent = parent.parentId ? ctx.graph.getNode(parent.parentId) : undefined
  }
}

function keepMeasuredPrimaryExtent(ctx: EditorContext, plan: WrapPlan, frame: SceneNode): void {
  if (!plan.preserveSpacing) return
  const axis = plan.geometry.direction === 'HORIZONTAL' ? 'width' : 'height'
  if (frame[axis] === plan.geometry.primaryExtent) return
  const primaryAxisSizing = frame.primaryAxisSizing
  // Pen's Add flex measures the original selection; later edits reflow its stretched children.
  ctx.graph.withLayoutMutations(() => {
    ctx.graph.updateNode(frame.id, {
      [axis]: plan.geometry.primaryExtent,
      primaryAxisSizing: 'FIXED'
    })
    try {
      computeLayout(ctx.graph, frame.id)
      reflowContainingLayouts(ctx, plan.parentId)
    } finally {
      ctx.graph.updateNode(frame.id, { primaryAxisSizing })
    }
  })
}

function applyWrap(ctx: EditorContext, plan: WrapPlan, frameId?: string): string {
  const frame = ctx.graph.createNode('FRAME', plan.parentId, {
    ...plan.frameFields,
    ...(frameId ? { id: frameId } : {})
  })
  ctx.graph.insertChildAt(frame.id, plan.parentId, plan.slot)
  const crossAxis = plan.geometry.direction === 'HORIZONTAL' ? 'VERTICAL' : 'HORIZONTAL'
  for (const id of plan.sortedIds) {
    ctx.graph.reparentNode(id, frame.id)
    const node = ctx.graph.getNode(id)
    if (
      plan.preserveSpacing &&
      node &&
      (plan.geometry.fillsCross || authoredLayoutSizing(ctx.graph, node, crossAxis) === 'FILL')
    )
      ctx.graph.updateNode(
        id,
        authoredLayoutSizingUpdates(
          ctx.graph,
          node,
          crossAxis,
          plan.geometry.fillsCross ? 'FILL' : 'FIXED'
        )
      )
  }
  computeLayout(ctx.graph, frame.id)
  ctx.runLayoutForNode(frame.id)
  keepMeasuredPrimaryExtent(ctx, plan, frame)
  ctx.setSelectedIds(new Set([frame.id]))
  return frame.id
}

function restoreBeforeWrap(
  ctx: EditorContext,
  plan: WrapPlan,
  frameId: string,
  clearSelection: boolean
): void {
  for (const id of plan.sortedIds) ctx.graph.reparentNode(id, plan.parentId)
  ctx.graph.deleteNode(frameId)
  plan.before.order.forEach((id, index) => ctx.graph.insertChildAt(id, plan.parentId, index))
  for (const [id, fields] of plan.before.sizing) ctx.graph.updateNode(id, fields)
  ctx.graph.withLayoutMutations(() => {
    for (const [id, rect] of plan.before.geometry) ctx.graph.updateNode(id, rect)
  })
  reflowContainingLayouts(ctx, plan.parentId)
  ctx.setSelectedIds(clearSelection ? new Set() : plan.before.selection)
}

/**
 * Wrap siblings at their topmost selected slot. Spacing-aware wrapping infers their flow and
 * measured extent; matching cross-axis bounds become Fill children in a fixed cross axis.
 * Undo restores every selected descendant's geometry, sizing, original order and selection.
 */
export function wrapInAutoLayout(
  ctx: EditorContext,
  selectedNodes: SceneNode[],
  preserveSpacing = false,
  clearSelectionOnUndo = preserveSpacing
): string | null {
  const parentId = wrapParentId(ctx, selectedNodes)
  const parent = parentId ? ctx.graph.getNode(parentId) : undefined
  if (!parent) return null
  const plan = createWrapPlan(ctx, selectedNodes, parent, preserveSpacing)
  const frameId = applyWrap(ctx, plan)
  ctx.undo.push({
    label: 'Wrap in auto layout',
    forward: () => {
      applyWrap(ctx, plan, frameId)
    },
    inverse: () => restoreBeforeWrap(ctx, plan, frameId, clearSelectionOnUndo)
  })
  return frameId
}
