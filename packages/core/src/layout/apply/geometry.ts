import type { Node as YogaNode } from 'yoga-layout'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { enforcedAspectRatio } from '@open-pencil/scene-graph/layout'
import { layoutConstrainedChildRect } from '@open-pencil/scene-graph/resize'

export type ComputeLayoutFn = (graph: SceneGraph, frameId: string) => void

export type LayoutGeometry = Partial<Pick<SceneNode, 'x' | 'y' | 'width' | 'height'>>

type GeometryOptions = { preservesImportedGeometry: boolean; keepsSaved: boolean }

/**
 * Writes only the geometry layout changed. Laying out a large page leaves most layers where they
 * were, and each write would notify every graph listener for nothing. A frame it resizes from
 * `before`, by default the size it has, places the layers its constraints govern; `constrained`
 * marks a write those constraints made, which places its own children in turn.
 */
export function writeLayoutGeometry(
  graph: SceneGraph,
  id: string,
  geometry: LayoutGeometry,
  {
    computeLayout,
    before,
    constrained = false
  }: {
    computeLayout: ComputeLayoutFn
    before?: { width: number; height: number }
    constrained?: boolean
  }
): void {
  const node = graph.getNode(id)
  if (!node) return
  const from = before ?? { width: node.width, height: node.height }
  const changes = geometryChanges(node, geometry)
  if (Object.keys(changes).length > 0) graph.updateNode(id, changes)
  if (!CONSTRAINT_PARENT_TYPES.has(node.type)) return
  // Laying out what a file holds, as a page opens or its fonts arrive, resizes a frame only where
  // our layout differs from the one the file saved; its children keep the places it saved.
  if (graph.isApplyingDerivedLayout && !constrained) return
  if (from.width !== node.width || from.height !== node.height) {
    constrainChildren(graph, node, from, computeLayout)
  }
}

function geometryChanges(node: SceneNode, geometry: LayoutGeometry): LayoutGeometry {
  const changes: LayoutGeometry = {}
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const value = geometry[key]
    if (value !== undefined && value !== node[key]) changes[key] = value
  }
  return changes
}

const CONSTRAINT_PARENT_TYPES: ReadonlySet<SceneNode['type']> = new Set([
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

/**
 * Places the children of a frame layout resized by their constraints: every child of a frame
 * without auto layout, and those that ignore an auto layout, as Figma keeps a badge pinned to the
 * right of a Hug button while its label grows. A child it resizes places its own children, and
 * lays out again when it has auto layout.
 */
function constrainChildren(
  graph: SceneGraph,
  frame: SceneNode,
  before: { width: number; height: number },
  computeLayout: ComputeLayoutFn
): void {
  for (const child of graph.getChildren(frame.id)) {
    if (frame.layoutMode !== 'NONE' && child.layoutPositioning !== 'ABSOLUTE') continue
    const size = { width: child.width, height: child.height }
    writeLayoutGeometry(
      graph,
      child.id,
      layoutConstrainedChildRect(
        child,
        before,
        frame,
        child.horizontalConstraint,
        child.verticalConstraint,
        enforcedAspectRatio(child)
      ),
      { computeLayout, constrained: true }
    )
    const resized = child.width !== size.width || child.height !== size.height
    if (resized && child.layoutMode !== 'NONE') computeLayout(graph, child.id)
  }
}

export function computedChildPosition(
  child: SceneNode,
  yogaChild: YogaNode,
  axis: 'x' | 'y',
  { preservesImportedGeometry, keepsSaved }: GeometryOptions
): number {
  if (preservesImportedGeometry) return child[axis]
  const computed = axis === 'x' ? yogaChild.getComputedLeft() : yogaChild.getComputedTop()
  if (child.type === 'INSTANCE' || !keepsSaved) return computed
  return child.derivedLayout?.[axis] ?? computed
}

function preservesStaleImportedTextSize(child: SceneNode, axis: 'width' | 'height'): boolean {
  const derivedSize = child.derivedLayout?.[axis]
  return (
    child.type === 'TEXT' &&
    child.source.format === 'fig' &&
    derivedSize !== undefined &&
    Math.abs(child[axis] - derivedSize) > 0.001
  )
}

export function computedChildSize(
  child: SceneNode,
  yogaChild: YogaNode,
  axis: 'width' | 'height',
  { preservesImportedGeometry, keepsSaved }: GeometryOptions
): number {
  if (preservesImportedGeometry || (keepsSaved && preservesStaleImportedTextSize(child, axis))) {
    return child[axis]
  }
  const computed = axis === 'width' ? yogaChild.getComputedWidth() : yogaChild.getComputedHeight()
  return resolvedComputedSize(child, axis, computed, keepsSaved)
}

function resolvedComputedSize(
  child: SceneNode,
  axis: 'width' | 'height',
  computed: number,
  keepsSaved: boolean
): number {
  if (child.type === 'TEXT' && child.source.format === 'fig') {
    return computed > 0 ? computed : child[axis]
  }
  if (!keepsSaved) return computed
  return child.derivedLayout?.[axis] ?? computed
}
