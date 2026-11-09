import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
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

/** A Note's authored height stays in metadata; its visible height fits the body. */
export function layoutNote(graph: SceneGraph, note: SceneNode): boolean {
  if (!noteOfNode(note)) return false
  const body = noteBody(graph, note)
  if (!body) return true
  const width = Math.max(NOTE_MIN_WIDTH, note.width)
  const bodyWidth = width - NOTE_PADDING * 2
  const measured = measureTextForLayout(
    { ...body, width: bodyWidth, textAutoResize: 'HEIGHT' },
    bodyWidth
  )
  const height = Math.max(NOTE_MIN_HEIGHT, Math.ceil(measured.height) + NOTE_PADDING * 2)
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
