import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '#scene-graph/plugin-data'

import type { GeneratedFrameKind } from '../kind'
import { noteOfNode, noteBody } from './model'

export const NOTE_KIND: GeneratedFrameKind = {
  complete: (graph, node) => noteBody(graph, node) !== undefined,
  text: noteBody,
  rotates: true,
  resizes: true,
  strokesAndEffects: true,
  namedByText: false,
  sized: (changes, node) => {
    const definition = { ...noteOfNode(node) }
    if (changes.width !== undefined) definition.width = changes.width
    if (changes.height !== undefined) definition.height = changes.height
    return { pluginData: withPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.note, definition) }
  }
}

export {
  NOTE_BACKGROUND,
  NOTE_COLORS,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
  NOTE_PADDING,
  noteForeground
} from './appearance'
export type { NoteDefinition } from './schema'
export { NOTE_FRAME_STYLE, NOTE_TEXT_STYLE } from './template'

export { noteOfNode, noteBody, initializeNote, isNoteInstanceCopy } from './model'
