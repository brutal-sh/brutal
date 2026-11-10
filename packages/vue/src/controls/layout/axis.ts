import type { LayoutSizing, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { layoutSizingUpdates, type LayoutSizingAxis } from '@open-pencil/scene-graph/layout'
export type LayoutAxis = 'width' | 'height'
export type SizeLimitProp = 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight'
export function sizingAxis(axis: LayoutAxis): LayoutSizingAxis {
  return axis === 'width' ? 'HORIZONTAL' : 'VERTICAL'
}

export function axisSizingPatchForNode(
  graph: SceneGraph,
  node: SceneNode,
  axis: LayoutAxis,
  sizing: LayoutSizing
): Partial<SceneNode> {
  return layoutSizingUpdates(graph, node, sizingAxis(axis), sizing)
}
