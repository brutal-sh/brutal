import type { Node as YogaNode } from 'yoga-layout'

import type { LayoutSizing, SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import {
  fillKeepsSizeInHuggingParent,
  setCrossAxisSizing,
  setMainAxisSizing
} from '#core/layout/axis-sizing'
import { keepsSavedLayout } from '#core/layout/derived'
import { hasDistributedGap } from '#core/layout/gap'

export function sizesFitParent(
  parent: SceneNode,
  childCount: number,
  sizes: Array<number | undefined>,
  axis: 'width' | 'height'
): boolean {
  if (sizes.some((size) => size === undefined)) return false
  const padding =
    axis === 'width'
      ? parent.paddingLeft + parent.paddingRight
      : parent.paddingTop + parent.paddingBottom
  const gap = hasDistributedGap(parent) ? 0 : parent.itemSpacing * Math.max(0, childCount - 1)
  const available = axis === 'width' ? parent.width : parent.height
  const total = sizes.reduce<number>((sum, size) => sum + (size ?? 0), padding + gap)
  return Math.abs(total - available) < 0.001
}

function derivedMainAxisFitsParent(
  graph: SceneGraph,
  parent: SceneNode,
  child: SceneNode,
  axis: 'width' | 'height'
): boolean {
  if (!keepsSavedLayout(graph, parent)) return false
  const children = graph
    .getChildren(parent.id)
    .filter((candidate) => candidate.visible && candidate.layoutPositioning !== 'ABSOLUTE')
  if (children.length === 0) return false

  const sizes = children.map((candidate) => candidate.derivedLayout?.[axis])
  return (
    sizesFitParent(parent, children.length, sizes, axis) &&
    child.derivedLayout?.[axis] !== undefined
  )
}

export function configureAutoLayoutChildSizing(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  {
    graph,
    widthSizing,
    heightSizing
  }: { graph: SceneGraph; widthSizing: LayoutSizing; heightSizing: LayoutSizing }
): void {
  const isParentRow = parent.layoutMode === 'HORIZONTAL'
  const fixedDerivedMainAxis = isParentRow
    ? derivedMainAxisFitsParent(graph, parent, child, 'width')
    : derivedMainAxisFitsParent(graph, parent, child, 'height')

  if (isParentRow) {
    if (fixedDerivedMainAxis) yogaChild.setWidth(child.derivedLayout?.width ?? child.width)
    else setMainAxisSizing(yogaChild, 'width', widthSizing, child.width, child.layoutGrow)
    const keepsSize = fillKeepsSizeInHuggingParent(child, parent, 'height')
    setCrossAxisSizing(yogaChild, 'height', heightSizing, child.height, keepsSize)
    return
  }

  const keepsSize = fillKeepsSizeInHuggingParent(child, parent, 'width')
  setCrossAxisSizing(yogaChild, 'width', widthSizing, child.width, keepsSize)
  if (fixedDerivedMainAxis) yogaChild.setHeight(child.derivedLayout?.height ?? child.height)
  else setMainAxisSizing(yogaChild, 'height', heightSizing, child.height, child.layoutGrow)
}
