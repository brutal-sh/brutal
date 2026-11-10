import type { Node as YogaNode } from 'yoga-layout'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { noteOfNode } from '@open-pencil/scene-graph/generated'

import {
  computedChildPosition,
  computedChildSize,
  writeLayoutGeometry,
  type LayoutGeometry,
  type ComputeLayoutFn
} from './apply/geometry'
import { keepsSavedLayout, usesDetachedDerivedLayout } from './derived'

function preservesImportedHugCrossSize(
  graph: SceneGraph,
  frame: SceneNode,
  axis: 'width' | 'height'
): boolean {
  if (frame.source.format !== 'fig' || frame.counterAxisSizing !== 'HUG') return false
  const expectedMode = axis === 'width' ? 'VERTICAL' : 'HORIZONTAL'
  if (frame.layoutMode !== expectedMode) return false
  return graph
    .getChildren(frame.id)
    .some(
      (child) => child.layoutAlignSelf === 'STRETCH' && child.derivedLayout?.[axis] !== undefined
    )
}
type LayoutPass = { computeLayout: ComputeLayoutFn; keepsSaved: boolean }

/**
 * The size each Hug frame had after layout last ran on it. Keyed by the node, so a deleted
 * frame's entry goes with it and a restored one starts afresh.
 */
const huggedSizes = new WeakMap<SceneNode, { width: number; height: number }>()

/**
 * The size a frame's constrained children move from as it hugs, or null when it hugs no axis.
 * An editor that resizes a Hug frame places its children for the size it sets, which layout then
 * hugs back, as when a parent stretches it; its children move only from the size it last hugged
 * to. An axis it does not hug keeps the size it has.
 */
function hugStart(frame: SceneNode): { width: number; height: number } | null {
  const row = frame.layoutMode === 'HORIZONTAL'
  const hugsWidth = (row ? frame.primaryAxisSizing : frame.counterAxisSizing) === 'HUG'
  const hugsHeight = (row ? frame.counterAxisSizing : frame.primaryAxisSizing) === 'HUG'
  if (!hugsWidth && !hugsHeight) {
    huggedSizes.delete(frame)
    return null
  }
  const hugged = huggedSizes.get(frame)
  return {
    width: hugsWidth && hugged ? hugged.width : frame.width,
    height: hugsHeight && hugged ? hugged.height : frame.height
  }
}

function computedHugSize(
  frame: SceneNode,
  yogaNode: YogaNode,
  axis: 'width' | 'height',
  keepsSaved: boolean
): number {
  const derived = keepsSaved ? frame.derivedLayout : null
  return (
    derived?.[axis] ??
    (axis === 'width' ? yogaNode.getComputedWidth() : yogaNode.getComputedHeight())
  )
}

function counterHugSize(
  graph: SceneGraph,
  frame: SceneNode,
  axis: 'width' | 'height',
  { keepsSaved, yogaNode }: { keepsSaved: boolean; yogaNode: YogaNode }
): number {
  if (keepsSaved && preservesImportedHugCrossSize(graph, frame, axis)) return frame[axis]
  return computedHugSize(frame, yogaNode, axis, keepsSaved)
}

function applyFrameSize(
  graph: SceneGraph,
  frame: SceneNode,
  yogaNode: YogaNode,
  { keepsSaved, computeLayout }: LayoutPass
): void {
  if (frame.layoutMode === 'GRID') {
    if (frame.gridTemplateRows.length === 0) {
      writeLayoutGeometry(
        graph,
        frame.id,
        { height: yogaNode.getComputedHeight() },
        { computeLayout }
      )
    }
    return
  }

  const before = hugStart(frame)
  if (!before) return

  const updates: LayoutGeometry = {}
  const primary = frame.layoutMode === 'HORIZONTAL' ? 'width' : 'height'
  const counter = primary === 'width' ? 'height' : 'width'
  if (frame.primaryAxisSizing === 'HUG')
    updates[primary] = computedHugSize(frame, yogaNode, primary, keepsSaved)
  if (frame.counterAxisSizing === 'HUG') {
    updates[counter] = counterHugSize(graph, frame, counter, { keepsSaved, yogaNode })
  }

  writeLayoutGeometry(graph, frame.id, updates, { computeLayout, before })
  huggedSizes.set(frame, { width: frame.width, height: frame.height })
}

function updateChildFromYoga(
  graph: SceneGraph,
  frame: SceneNode,
  child: SceneNode,
  { yogaChild, keepsSaved, computeLayout }: LayoutPass & { yogaChild: YogaNode }
): void {
  if (!child.visible || child.layoutPositioning === 'ABSOLUTE') return

  const savedFig = keepsSaved && child.source.format === 'fig'
  const preservesImportedFrameGeometry =
    savedFig && frame.source.format === 'fig' && (child.type === 'FRAME' || child.type === 'LINE')
  const preservesImportedPosition =
    preservesImportedFrameGeometry || (savedFig && Math.abs(child.rotation) > 0.001)
  writeLayoutGeometry(
    graph,
    child.id,
    {
      x: computedChildPosition(child, yogaChild, 'x', {
        preservesImportedGeometry: preservesImportedPosition,
        keepsSaved
      }),
      y: computedChildPosition(child, yogaChild, 'y', {
        preservesImportedGeometry: preservesImportedPosition,
        keepsSaved
      }),
      width: computedChildSize(child, yogaChild, 'width', {
        preservesImportedGeometry: preservesImportedFrameGeometry,
        keepsSaved
      }),
      height: computedChildSize(child, yogaChild, 'height', {
        preservesImportedGeometry: preservesImportedFrameGeometry,
        keepsSaved
      })
    },
    { computeLayout }
  )
}

function preservesImportedInstanceInternals(child: SceneNode): boolean {
  return child.type === 'INSTANCE' && child.source.format === 'fig'
}

function recomputeGridChild(
  graph: SceneGraph,
  child: SceneNode,
  computeLayout: ComputeLayoutFn
): void {
  const updated = graph.getNode(child.id)
  if (!updated || updated.layoutMode === 'NONE') return

  const savedPrimary = updated.primaryAxisSizing
  const savedCounter = updated.counterAxisSizing
  const updates: Partial<SceneNode> = {}

  if (savedPrimary === 'HUG') updates.primaryAxisSizing = 'FIXED'
  if (savedCounter === 'HUG') updates.counterAxisSizing = 'FIXED'
  if (Object.keys(updates).length > 0) graph.updateNode(child.id, updates)

  computeLayout(graph, child.id)

  const restore: Partial<SceneNode> = {}
  if (updates.primaryAxisSizing) restore.primaryAxisSizing = savedPrimary
  if (updates.counterAxisSizing) restore.counterAxisSizing = savedCounter
  if (Object.keys(restore).length > 0) graph.updateNode(child.id, restore)
}

export function applyYogaLayout(
  graph: SceneGraph,
  frame: SceneNode,
  yogaNode: YogaNode,
  computeLayout: ComputeLayoutFn
): void {
  const keepsSaved = keepsSavedLayout(graph, frame)
  applyFrameSize(graph, frame, yogaNode, { keepsSaved, computeLayout })

  const children = graph.getChildren(frame.id)
  let yogaIndex = 0
  for (const child of children) {
    if (yogaIndex >= yogaNode.getChildCount()) continue
    const yogaChild = yogaNode.getChild(yogaIndex)
    yogaIndex++

    updateChildFromYoga(graph, frame, child, { yogaChild, keepsSaved, computeLayout })

    recomputeChildLayout(graph, frame, child, { yogaChild, computeLayout })
  }
}

function recomputeChildLayout(
  graph: SceneGraph,
  frame: SceneNode,
  child: SceneNode,
  { yogaChild, computeLayout }: { yogaChild: YogaNode; computeLayout: ComputeLayoutFn }
): void {
  if (!child.visible) return
  if (preservesImportedInstanceInternals(child)) return
  if (noteOfNode(child)) {
    computeLayout(graph, child.id)
    return
  }
  if (usesDetachedDerivedLayout(graph, child)) {
    computeLayout(graph, child.id)
    return
  }
  if (child.layoutMode !== 'NONE') {
    if (child.layoutMode === 'GRID' && child.layoutPositioning !== 'ABSOLUTE') {
      computeLayout(graph, child.id)
    } else if (frame.layoutMode === 'GRID' && child.layoutPositioning !== 'ABSOLUTE') {
      recomputeGridChild(graph, child, computeLayout)
    } else {
      applyYogaLayout(graph, child, yogaChild, computeLayout)
    }
  }
}
