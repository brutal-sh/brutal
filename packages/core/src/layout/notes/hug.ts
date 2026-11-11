import { Edge, type Node as YogaNode } from 'yoga-layout'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { noteOfNode } from '@open-pencil/scene-graph/generated'
import {
  layoutJustification,
  layoutSizing,
  layoutSizingInParent
} from '@open-pencil/scene-graph/layout'
import { OPEN_PENCIL_PLUGIN_DATA, readPluginData } from '@open-pencil/scene-graph/plugin-data'

import { hasDistributedGap } from '#core/layout/gap'

function noteHugHeight(graph: SceneGraph, frame: SceneNode, yoga: YogaNode): number | undefined {
  if (frame.layoutWrap === 'WRAP') return undefined
  if (layoutSizing(graph, frame, 'VERTICAL') !== 'HUG') return undefined
  const children = graph.getChildren(frame.id)
  const flow = children.flatMap((child, index) =>
    child.visible && child.layoutPositioning !== 'ABSOLUTE' ? [{ child, index }] : []
  )
  const contributions = flow.filter(
    ({ child }) => !(noteOfNode(child) && layoutSizingInParent(frame, child, 'VERTICAL') === 'FILL')
  )
  if (contributions.length === flow.length) return undefined
  if (contributions.length === 0)
    return readPluginData(frame.pluginData, OPEN_PENCIL_PLUGIN_DATA.hugFallback)?.VERTICAL ?? 0
  const heights = contributions.map(({ index }) => yoga.getChild(index).getComputedHeight())
  const row = frame.layoutMode === 'HORIZONTAL'
  const gap = row || hasDistributedGap(frame) ? 0 : frame.itemSpacing * (heights.length - 1)
  const content = row ? Math.max(...heights) : heights.reduce((sum, height) => sum + height, 0)
  return frame.paddingTop + content + gap + frame.paddingBottom
}

function noteHugPaddingOffset(frame: SceneNode): number {
  const alignment =
    frame.layoutMode === 'HORIZONTAL' ? frame.counterAxisAlign : layoutJustification(frame)
  let factor = 0
  if (alignment === 'CENTER' || alignment === 'SPACE_AROUND') factor = 0.5
  else if (alignment === 'MAX') factor = 1
  return frame.paddingTop - factor * (frame.paddingTop + frame.paddingBottom)
}

function applyNoteHugHeight(
  graph: SceneGraph,
  frame: SceneNode,
  yoga: YogaNode,
  height: number
): void {
  yoga.setHeight(height)
  const effectiveHeight = Math.max(
    frame.minHeight ?? 0,
    Math.min(frame.maxHeight ?? Infinity, height)
  )
  if (effectiveHeight >= frame.paddingTop + frame.paddingBottom) return
  // Yoga floors boxes at their padding; Pen's circular fallback can be smaller.
  yoga.setPadding(Edge.Top, 0)
  yoga.setPadding(Edge.Bottom, 0)
  const offset = noteHugPaddingOffset(frame)
  for (const [index, child] of graph.getChildren(frame.id).entries()) {
    if (child.visible && child.layoutPositioning !== 'ABSOLUTE')
      yoga.getChild(index).setPosition(Edge.Top, offset)
  }
}

/** Fill Notes keep intrinsic bodies but do not contribute to their parent's Hug height. */
export function resolveNoteHugLayout(
  graph: SceneGraph,
  frame: SceneNode,
  yoga: YogaNode,
  reflow: () => void
): void {
  if (frame.layoutMode !== 'HORIZONTAL' && frame.layoutMode !== 'VERTICAL') return
  if (graph.getChildren(frame.id).length !== yoga.getChildCount()) return
  for (const [index, child] of graph.getChildren(frame.id).entries()) {
    if (child.visible && (child.layoutMode === 'HORIZONTAL' || child.layoutMode === 'VERTICAL'))
      resolveNoteHugLayout(graph, child, yoga.getChild(index), reflow)
  }
  const height = noteHugHeight(graph, frame, yoga)
  if (height === undefined || height === yoga.getComputedHeight()) return
  applyNoteHugHeight(graph, frame, yoga, height)
  reflow()
}
