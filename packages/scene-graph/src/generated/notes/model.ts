import { colorToFill } from '#scene-graph/color'
import type { SceneGraph } from '#scene-graph/graph'
import { OPEN_PENCIL_PLUGIN_DATA, readPluginData, withPluginData } from '#scene-graph/plugin-data'
import type { Color } from '#scene-graph/primitives'
import type { SceneNode } from '#scene-graph/types'

import {
  NOTE_BACKGROUND,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
  NOTE_PADDING,
  noteForeground
} from './appearance'
import type { NoteDefinition } from './schema'
import { NOTE_FRAME_STYLE, NOTE_TEXT_STYLE } from './template'

type NoteCandidate = Pick<SceneNode, 'type'> & Partial<Pick<SceneNode, 'pluginData'>>

export function noteOfNode(node: NoteCandidate): NoteDefinition | undefined {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
    ? readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.note)
    : undefined
}

export function noteBody(graph: SceneGraph, note: SceneNode): SceneNode | undefined {
  const body = graph.getNode(note.childIds[0] ?? '')
  return noteOfNode(note) && note.childIds.length === 1 && body?.type === 'TEXT' ? body : undefined
}

/** A Note resolved inside an enclosing instance has no independent instance actions in Pen. */
export function isNoteInstanceCopy(graph: SceneGraph, node: SceneNode): boolean {
  return (
    node.type === 'INSTANCE' &&
    !!noteOfNode(node) &&
    !!node.parentId &&
    !!graph.closest(node.parentId, (parent) => parent.type === 'INSTANCE')
  )
}

/** Attach an independently editable Note body without changing FigJam sticky notes. */
export function initializeNote(
  graph: SceneGraph,
  note: SceneNode,
  options: { definition: NoteDefinition; content: string; color?: Color; body?: SceneNode }
): SceneNode {
  note.pluginData = withPluginData(
    note.pluginData,
    OPEN_PENCIL_PLUGIN_DATA.note,
    options.definition
  )
  note.width = Math.max(NOTE_MIN_WIDTH, note.width)
  note.height = NOTE_MIN_HEIGHT
  Object.assign(note, structuredClone(NOTE_FRAME_STYLE))
  note.fills = [colorToFill(options.color ?? NOTE_BACKGROUND)]
  const bodyFields = {
    name: 'Note content',
    text: options.content,
    ...structuredClone(NOTE_TEXT_STYLE),
    width: note.width - NOTE_PADDING * 2,
    height: NOTE_MIN_HEIGHT - NOTE_PADDING * 2,
    fills: [colorToFill(noteForeground(note.fills[0].color))]
  }
  if (options.body) {
    graph.updateNode(options.body.id, bodyFields)
    return options.body
  }
  return graph.createNode('TEXT', note.id, bodyFields)
}
