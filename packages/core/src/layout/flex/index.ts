import {
  Align,
  Direction,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Overflow,
  Wrap,
  type Node as YogaNode
} from 'yoga-layout'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { isGeneratedFrame } from '@open-pencil/scene-graph/generated'
import { layoutJustification, layoutSizing } from '@open-pencil/scene-graph/layout'
import { resolveNodeLayoutDirection } from '@open-pencil/scene-graph/text/direction'

import { asLaidOutIn, heldHugAxis, ownAxisSizing } from '#core/layout/axis-sizing'
import { usesDetachedDerivedLayout } from '#core/layout/derived'
import { hasDistributedGap } from '#core/layout/gap'
import { createGridChildNode } from '#core/layout/grid'
import { configureChildAsLeaf } from '#core/layout/leaf'
import {
  applyLockedAspectRatio,
  applyMinMaxConstraints,
  configureAbsoluteChild,
  createYogaNode,
  mapAlign,
  mapAlignSelf,
  mapGridTrack,
  mapJustify,
  parentStretchedAxis
} from '#core/layout/yoga-helpers'

import { configureAutoLayoutChildSizing } from './sizing'
type FlexContext = { graph: SceneGraph; inheritedDirection: 'LTR' | 'RTL' }

export function buildYogaTree(
  graph: SceneGraph,
  frame: SceneNode,
  inheritedDirection: 'LTR' | 'RTL'
): YogaNode {
  const root = createYogaNode()
  const direction = resolveNodeLayoutDirection(frame, inheritedDirection)

  if (frame.primaryAxisSizing === 'FIXED') {
    if (frame.layoutMode === 'HORIZONTAL') root.setWidth(frame.width)
    else root.setHeight(frame.height)
  }
  if (frame.counterAxisSizing === 'FIXED') {
    if (frame.layoutMode === 'HORIZONTAL') root.setHeight(frame.height)
    else root.setWidth(frame.width)
  }
  // Laid out on its own, a frame its parent stretches keeps the size the parent gave it on
  // that axis, so its content aligns within that size rather than within a hug.
  const stretchedAxis = parentStretchedAxis(graph, frame)
  if (stretchedAxis === 'width') root.setWidth(frame.width)
  if (stretchedAxis === 'height') root.setHeight(frame.height)
  const heldAxis = heldHugAxis(graph, frame)
  if (heldAxis === 'width') root.setWidth(frame.width)
  if (heldAxis === 'height') root.setHeight(frame.height)

  configureFlexContainer(root, frame, direction)

  appendFlexChildren(root, frame, { graph, inheritedDirection: direction })
  return root
}

function appendFlexChildren(
  root: YogaNode,
  frame: SceneNode,
  { graph, inheritedDirection }: FlexContext
): void {
  const children = graph.getChildren(frame.id).map((child) => asLaidOutIn(graph, child, frame))
  for (const child of children) {
    const yogaChild = createYogaNode()

    if (child.layoutPositioning === 'ABSOLUTE') {
      configureAbsoluteChild(yogaChild, child)
    } else if (!child.visible) {
      yogaChild.setDisplay(Display.None)
    } else if (child.layoutMode === 'GRID') {
      configureChildAsGrid(yogaChild, child, frame, { graph, inheritedDirection })
    } else if (child.layoutMode !== 'NONE') {
      configureChildAsAutoLayout(yogaChild, child, frame, { graph, inheritedDirection })
    } else {
      configureChildAsLeaf(yogaChild, child, frame, graph)
    }

    root.insertChild(yogaChild, root.getChildCount())
  }
}

function configureFlexContainer(
  yogaNode: YogaNode,
  node: SceneNode,
  direction: Exclude<SceneNode['layoutDirection'], 'AUTO'>
): void {
  yogaNode.setDirection(direction === 'RTL' ? Direction.RTL : Direction.LTR)
  yogaNode.setFlexDirection(
    node.layoutMode === 'HORIZONTAL' ? FlexDirection.Row : FlexDirection.Column
  )
  yogaNode.setFlexWrap(node.layoutWrap === 'WRAP' ? Wrap.Wrap : Wrap.NoWrap)
  yogaNode.setJustifyContent(mapJustify(layoutJustification(node)))
  yogaNode.setAlignItems(mapAlign(node.counterAxisAlign))
  if (node.clipsContent) yogaNode.setOverflow(Overflow.Hidden)

  if (node.layoutWrap === 'WRAP' && node.counterAxisAlignContent === 'SPACE_BETWEEN') {
    yogaNode.setAlignContent(Align.SpaceBetween)
  }

  yogaNode.setPadding(Edge.Top, node.paddingTop)
  yogaNode.setPadding(Edge.Right, node.paddingRight)
  yogaNode.setPadding(Edge.Bottom, node.paddingBottom)
  yogaNode.setPadding(Edge.Left, node.paddingLeft)

  configureFlexGap(yogaNode, node)
  applyMinMaxConstraints(yogaNode, node)
}

function configureFlexGap(yogaNode: YogaNode, node: SceneNode): void {
  // Distributed spacing replaces the gap. A generated frame keeps it
  // as the least space between its sublayers, as a sticky note keeps its author clear of a long body.
  const primaryGap = hasDistributedGap(node) && !isGeneratedFrame(node) ? 0 : node.itemSpacing
  yogaNode.setGap(
    Gutter.Column,
    node.layoutMode === 'HORIZONTAL' ? primaryGap : node.counterAxisSpacing
  )
  yogaNode.setGap(
    Gutter.Row,
    node.layoutMode === 'HORIZONTAL' ? node.counterAxisSpacing : primaryGap
  )
}

function configureNestedGridStyle(
  yogaChild: YogaNode,
  child: SceneNode,
  direction: 'LTR' | 'RTL'
): void {
  yogaChild.setDisplay(Display.Grid)
  yogaChild.setDirection(direction === 'RTL' ? Direction.RTL : Direction.LTR)

  if (child.gridTemplateColumns.length > 0) {
    yogaChild.setGridTemplateColumns(child.gridTemplateColumns.map(mapGridTrack))
  }
  if (child.gridTemplateRows.length > 0) {
    yogaChild.setGridTemplateRows(child.gridTemplateRows.map(mapGridTrack))
  }

  yogaChild.setGap(Gutter.Column, child.gridColumnGap)
  yogaChild.setGap(Gutter.Row, child.gridRowGap)

  yogaChild.setPadding(Edge.Top, child.paddingTop)
  yogaChild.setPadding(Edge.Right, child.paddingRight)
  yogaChild.setPadding(Edge.Bottom, child.paddingBottom)
  yogaChild.setPadding(Edge.Left, child.paddingLeft)
}

function configureChildAsGrid(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  { graph, inheritedDirection }: FlexContext
): void {
  const direction = resolveNodeLayoutDirection(child, inheritedDirection)
  configureNestedGridStyle(yogaChild, child, direction)

  configureGridChildSizing(yogaChild, child, parent)

  const selfAlign = mapAlignSelf(child.layoutAlignSelf)
  if (selfAlign != null) yogaChild.setAlignSelf(selfAlign)

  applyLockedAspectRatio(yogaChild, child, parent)
  applyMinMaxConstraints(yogaChild, child)

  const grandchildren = graph.getChildren(child.id)
  for (const gc of grandchildren) {
    if (gc.layoutPositioning === 'ABSOLUTE') {
      const yogaGC = createYogaNode()
      configureAbsoluteChild(yogaGC, gc)
      yogaChild.insertChild(yogaGC, yogaChild.getChildCount())
    } else {
      yogaChild.insertChild(createGridChildNode(graph, gc), yogaChild.getChildCount())
    }
  }
}

function configureGridChildSizing(yogaChild: YogaNode, child: SceneNode, parent: SceneNode): void {
  const isParentRow = parent.layoutMode === 'HORIZONTAL'
  const selfOverride = child.layoutAlignSelf !== 'AUTO'
  const stretchCross = selfOverride
    ? child.layoutAlignSelf === 'STRETCH'
    : parent.counterAxisAlign === 'STRETCH'

  if (child.layoutGrow > 0) {
    yogaChild.setFlexGrow(child.layoutGrow)
    yogaChild.setFlexShrink(1)
    yogaChild.setFlexBasis(0)
    if (!stretchCross) {
      if (isParentRow) yogaChild.setHeight(child.height)
      else yogaChild.setWidth(child.width)
    }
  } else {
    if (isParentRow) {
      yogaChild.setWidth(child.width)
      if (!stretchCross) yogaChild.setHeight(child.height)
    } else {
      if (child.gridTemplateRows.length > 0) yogaChild.setHeight(child.height)
      if (!stretchCross) yogaChild.setWidth(child.width)
    }
  }
}

function configureDetachedChild(yogaChild: YogaNode, child: SceneNode, graph: SceneGraph): boolean {
  if (!usesDetachedDerivedLayout(graph, child)) return false
  // The imported size is what the child's own hug produced, whether or not it also fills.
  const derived = child.derivedLayout
  if (ownAxisSizing(child, 'width') === 'HUG') yogaChild.setWidth(derived?.width ?? child.width)
  if (ownAxisSizing(child, 'height') === 'HUG') yogaChild.setHeight(derived?.height ?? child.height)
  applyMinMaxConstraints(yogaChild, child)
  return true
}

function configureChildAsAutoLayout(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  { graph, inheritedDirection }: FlexContext
): void {
  const direction = resolveNodeLayoutDirection(child, inheritedDirection)
  const widthSizing = layoutSizing(graph, child, 'HORIZONTAL')
  const heightSizing = layoutSizing(graph, child, 'VERTICAL')

  configureAutoLayoutChildSizing(yogaChild, child, parent, { graph, widthSizing, heightSizing })

  const selfAlign = mapAlignSelf(child.layoutAlignSelf)
  if (selfAlign != null) yogaChild.setAlignSelf(selfAlign)
  applyLockedAspectRatio(yogaChild, child, parent)

  if (configureDetachedChild(yogaChild, child, graph)) return

  configureFlexContainer(yogaChild, child, direction)
  const heldAxis = heldHugAxis(graph, child)
  if (heldAxis === 'width' && widthSizing === 'HUG') yogaChild.setWidth(child.width)
  if (heldAxis === 'height' && heightSizing === 'HUG') yogaChild.setHeight(child.height)

  appendFlexChildren(yogaChild, child, { graph, inheritedDirection: direction })
}
