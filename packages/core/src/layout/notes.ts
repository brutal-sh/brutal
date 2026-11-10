import { MeasureMode, type Node as YogaNode } from 'yoga-layout'

import type { LayoutAlignSelf, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'
import {
  noteBody,
  noteOfNode,
  noteForeground,
  NOTE_MIN_WIDTH,
  NOTE_MIN_HEIGHT,
  NOTE_PADDING
} from '@open-pencil/scene-graph/generated'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'

import { measureTextForLayout } from './text-measurement'
import { mapAlignSelf } from './yoga-helpers'

function noteSize(body: SceneNode, availableWidth: number) {
  const width = Math.max(NOTE_MIN_WIDTH, availableWidth)
  const bodyWidth = width - NOTE_PADDING * 2
  const measured = measureTextForLayout(
    { ...body, width: bodyWidth, textAutoResize: 'HEIGHT' },
    bodyWidth
  )
  return { width, height: Math.max(NOTE_MIN_HEIGHT, Math.ceil(measured.height) + NOTE_PADDING * 2) }
}

function noteFillsWidth(node: SceneNode, parent: SceneNode): boolean {
  return parent.layoutMode === 'HORIZONTAL'
    ? node.layoutGrow > 0
    : node.layoutAlignSelf === 'STRETCH' ||
        (node.layoutAlignSelf === 'AUTO' && parent.counterAxisAlign === 'STRETCH')
}

function configureNoteWidth(yoga: YogaNode, node: SceneNode, parent: SceneNode): void {
  const row = parent.layoutMode === 'HORIZONTAL'
  const fillsWidth = noteFillsWidth(node, parent)
  yoga.setMinWidth(NOTE_MIN_WIDTH)
  if (fillsWidth && row) {
    yoga.setFlexGrow(node.layoutGrow)
    yoga.setFlexShrink(1)
    yoga.setFlexBasis(0)
  } else if (!fillsWidth) yoga.setWidth(Math.max(NOTE_MIN_WIDTH, node.width))
}

function noteAlignment(node: SceneNode, parent: SceneNode): LayoutAlignSelf {
  const row = parent.layoutMode === 'HORIZONTAL'
  const parentStretches = parent.counterAxisAlign === 'STRETCH'
  let alignment = node.layoutAlignSelf
  if (
    row &&
    (node.layoutAlignSelf === 'STRETCH' || (node.layoutAlignSelf === 'AUTO' && parentStretches))
  )
    alignment = parentStretches ? 'MIN' : 'AUTO'
  return alignment
}

/** Fill height remains authored intent; a Note's content determines its flex allocation. */
export function configureNoteLeaf(
  yoga: YogaNode,
  node: SceneNode,
  parent: SceneNode,
  graph: SceneGraph
): boolean {
  const body = noteBody(graph, node)
  if (!body) return false
  configureNoteWidth(yoga, node, parent)
  const selfAlign = mapAlignSelf(noteAlignment(node, parent))
  if (selfAlign !== null) yoga.setAlignSelf(selfAlign)
  yoga.setMeasureFunc((width, mode) =>
    noteSize(body, mode === MeasureMode.Undefined ? node.width : width)
  )
  return true
}

/** A Note's authored height stays in metadata; its visible height fits the body. */
export function layoutNote(graph: SceneGraph, note: SceneNode): boolean {
  if (!noteOfNode(note)) return false
  const body = noteBody(graph, note)
  if (!body) return true
  const { width, height } = noteSize(body, note.width)
  const bodyWidth = width - NOTE_PADDING * 2
  const background = (resolvedPaintBindings(graph, note).fills ?? note.fills).at(0)
  graph.updateNode(note.id, { width, height })
  graph.updateNode(body.id, {
    x: NOTE_PADDING,
    y: NOTE_PADDING,
    width: bodyWidth,
    height: height - NOTE_PADDING * 2,
    ...(background ? { fills: [colorToFill(noteForeground(background.color))] } : {})
  })
  return true
}
