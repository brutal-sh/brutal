import { MeasureMode, type Node as YogaNode } from 'yoga-layout'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { asFlatLeaf } from './axis-sizing'
import { sizesFitParent } from './flex/sizing'
import { configureNoteLeaf } from './notes'
import { estimateTextSize, getTextMeasurer, measureTextForLayout } from './text-measurement'
import {
  applyLockedAspectRatio,
  applyMinMaxConstraints,
  configureNonTextLeaf,
  mapAlignSelf
} from './yoga-helpers'

function derivedGrowingLeafFitsParent(
  graph: SceneGraph,
  parent: SceneNode,
  child: SceneNode,
  axis: 'width' | 'height'
): boolean {
  if (child.type !== 'TEXT' || child.layoutGrow <= 0 || child.derivedLayout?.[axis] === undefined) {
    return false
  }
  const children = graph
    .getChildren(parent.id)
    .filter((candidate) => candidate.visible && candidate.layoutPositioning !== 'ABSOLUTE')
  const sizes = children.map((candidate) => {
    if (candidate.layoutGrow > 0) return candidate.derivedLayout?.[axis]
    return axis === 'width' ? candidate.width : candidate.height
  })
  return sizesFitParent(parent, children.length, sizes, axis)
}

/**
 * Fill text shares its parent's main axis like a fill frame: it grows and shrinks from a zero
 * basis, so its stored width (100px for new text) never decides its share. Returns whether
 * it fills the row's width, where its stored width must not constrain it either.
 */
function configureGrowingText(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  fixedDerivedMainAxis: boolean
): boolean {
  if (child.layoutGrow <= 0 || fixedDerivedMainAxis) return false
  yogaChild.setFlexGrow(child.layoutGrow)
  yogaChild.setFlexShrink(1)
  yogaChild.setFlexBasis(0)
  return parent.layoutMode === 'HORIZONTAL'
}

function configureTextLeafWithoutMeasurer(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  fixedDerivedMainAxis: boolean
): void {
  const hasStoredSize = hasStoredTextSize(child)
  if (child.textAutoResize === 'WIDTH_AND_HEIGHT') {
    if (hasStoredSize) {
      yogaChild.setWidth(child.width)
      yogaChild.setHeight(child.height)
    } else {
      const estimated = estimateTextSize(child)
      yogaChild.setWidth(estimated.width)
      yogaChild.setHeight(estimated.height)
    }
    return
  }
  if (child.textAutoResize !== 'HEIGHT') return
  configureUnmeasuredHeightText(yogaChild, child, parent, { fixedDerivedMainAxis, hasStoredSize })
}

function hasStoredTextSize(child: SceneNode): boolean {
  return child.width > 0 && child.height > 0 && !(child.width === 100 && child.height === 100)
}

function textMeasurementWidth(child: SceneNode, fixedDerivedMainAxis: boolean): number {
  return fixedDerivedMainAxis ? (child.derivedLayout?.width ?? child.width) : child.width
}

function configureUnmeasuredHeightText(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  { fixedDerivedMainAxis, hasStoredSize }: { fixedDerivedMainAxis: boolean; hasStoredSize: boolean }
): void {
  const growsWidth = configureGrowingText(yogaChild, child, parent, fixedDerivedMainAxis)
  const isRow = parent.layoutMode === 'HORIZONTAL'
  const measurementWidth = textMeasurementWidth(child, fixedDerivedMainAxis)
  const stretches =
    child.layoutAlignSelf === 'STRETCH' ||
    (child.layoutAlignSelf === 'AUTO' && parent.counterAxisAlign === 'STRETCH')
  if (!(!isRow && stretches) && !fixedDerivedMainAxis && !growsWidth) {
    yogaChild.setWidth(child.width)
  }
  if (hasStoredSize) yogaChild.setHeight(child.height)
  else yogaChild.setHeight(estimateTextSize(child, measurementWidth).height)
}

function configureDerivedMainAxis(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  graph: SceneGraph
): boolean {
  const isRow = parent.layoutMode === 'HORIZONTAL'
  const fixedDerivedMainAxis = isRow
    ? derivedGrowingLeafFitsParent(graph, parent, child, 'width')
    : derivedGrowingLeafFitsParent(graph, parent, child, 'height')

  if (fixedDerivedMainAxis) {
    if (isRow) yogaChild.setWidth(child.derivedLayout?.width ?? child.width)
    else yogaChild.setHeight(child.derivedLayout?.height ?? child.height)
  }
  return fixedDerivedMainAxis
}

function configureFixedLeaf(yogaChild: YogaNode, child: SceneNode, parent: SceneNode): void {
  const isRow = parent.layoutMode === 'HORIZONTAL'
  const stretchCross =
    child.layoutAlignSelf !== 'AUTO'
      ? child.layoutAlignSelf === 'STRETCH'
      : parent.counterAxisAlign === 'STRETCH'
  configureNonTextLeaf(yogaChild, child, isRow, stretchCross)
  // Fixed text contributes its intrinsic box even when siblings stretch across a Hug parent.
  if (child.type === 'TEXT' && stretchCross && parent.counterAxisSizing === 'HUG') {
    if (isRow) yogaChild.setMinHeight(child.height)
    else yogaChild.setMinWidth(child.width)
  }
}

function configureLeafContent(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  fixedDerivedMainAxis: boolean
): void {
  if (child.type !== 'TEXT' || child.textAutoResize === 'NONE') {
    configureFixedLeaf(yogaChild, child, parent)
  } else if (getTextMeasurer()) configureTextLeaf(yogaChild, child, parent, fixedDerivedMainAxis)
  else configureTextLeafWithoutMeasurer(yogaChild, child, parent, fixedDerivedMainAxis)
}

export function configureChildAsLeaf(
  yogaChild: YogaNode,
  node: SceneNode,
  parent: SceneNode,
  graph: SceneGraph
): void {
  if (configureNoteLeaf(yogaChild, node, parent, graph)) return
  const child = asFlatLeaf(node, parent)
  const fixedDerivedMainAxis = configureDerivedMainAxis(yogaChild, child, parent, graph)
  configureLeafContent(yogaChild, child, parent, fixedDerivedMainAxis)
  const selfAlign = mapAlignSelf(child.layoutAlignSelf)
  if (selfAlign != null) yogaChild.setAlignSelf(selfAlign)

  applyLockedAspectRatio(yogaChild, child, parent)
  applyMinMaxConstraints(yogaChild, child)
}

function configureAutoWidthText(yogaChild: YogaNode, child: SceneNode, fillsWidth: boolean): void {
  const cache = new Map<number, { width: number; height: number }>()
  const UNCONSTRAINED_KEY = -1
  const importedSize = child.derivedLayout
  if (importedSize?.width !== undefined && importedSize.height !== undefined) {
    yogaChild.setWidth(child.width)
    yogaChild.setHeight(child.height)
    return
  }

  // Auto-width text keeps each line whole, as Figma's does, in a parent narrower than the text;
  // only a width that layout or a max width sets wraps it.
  const wraps = fillsWidth || child.maxWidth != null
  yogaChild.setMeasureFunc((width, widthMode, _height, _heightMode) => {
    const maxW = wraps && widthMode !== MeasureMode.Undefined ? width : undefined
    const cacheKey = maxW === undefined ? UNCONSTRAINED_KEY : Math.round(maxW)
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const result = measureTextForLayout(child, maxW)
    cache.set(cacheKey, result)
    return result
  })
}

function configureTextLeaf(
  yogaChild: YogaNode,
  child: SceneNode,
  parent: SceneNode,
  fixedDerivedMainAxis = false
): void {
  const autoResize = child.textAutoResize
  const isRow = parent.layoutMode === 'HORIZONTAL'
  const growsWidth = configureGrowingText(yogaChild, child, parent, fixedDerivedMainAxis)
  const stretchesCross =
    child.layoutAlignSelf === 'STRETCH' ||
    (child.layoutAlignSelf === 'AUTO' && parent.counterAxisAlign === 'STRETCH')
  // Layout sets the width of text that grows along a row or stretches across a column.
  const fillsWidth = (!isRow && stretchesCross) || growsWidth

  if (autoResize === 'WIDTH_AND_HEIGHT') {
    configureAutoWidthText(yogaChild, child, fillsWidth)
  } else if (autoResize === 'HEIGHT') {
    configureAutoHeightText(yogaChild, child, { fixedDerivedMainAxis, fillsWidth })
  }
}

function configureAutoHeightText(
  yogaChild: YogaNode,
  child: SceneNode,
  { fixedDerivedMainAxis, fillsWidth }: { fixedDerivedMainAxis: boolean; fillsWidth: boolean }
): void {
  const cache = new Map<number, { width: number; height: number }>()
  const fixedWidth = textMeasurementWidth(child, fixedDerivedMainAxis)
  // Let Yoga stretch or grow fill-width text instead of fixing its stored width.
  if (child.layoutGrow <= 0 && !fillsWidth) {
    yogaChild.setWidth(fixedWidth)
  }
  yogaChild.setMeasureFunc((width, widthMode, _height, _heightMode) => {
    let constraintW = fixedWidth
    if (fillsWidth) {
      if (widthMode !== MeasureMode.Undefined) constraintW = width
    } else if (widthMode !== MeasureMode.Undefined) {
      constraintW = Math.min(width, fixedWidth || width)
    }
    const cacheKey = Math.round(constraintW)
    const cached = cache.get(cacheKey)
    if (cached) return cached

    if (constraintW === child.width && (child.derivedTextGlyphs?.length ?? 0) > 0) {
      return { width: constraintW, height: child.height }
    }
    const result = { width: constraintW, height: measureTextForLayout(child, constraintW).height }
    cache.set(cacheKey, result)
    return result
  })
}
