import { initializeNote } from '@open-pencil/scene-graph/generated'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { prepareSlotEdits } from '#core/editor/components/slots'
import type { NodePreview } from '#core/editor/node-preview'
import type { EditorContext } from '#core/editor/types'
import { pushCreatedSubtreesUndo } from '#core/editor/undo'

import { createNoteColorActions } from './color'
import { createNoteComponentActions } from './components'
import { createNoteLayoutActions } from './layout'

export function createNoteActions(
  ctx: EditorContext,
  beginPreview: (label: string) => NodePreview
) {
  /** Place a Pen Note at a parent-local position, with one creation undo step. */
  function createNote(parentId: string, position: Vector) {
    return ctx.undo.runBatch('Create note', () => {
      if (!prepareSlotEdits(ctx, [parentId])) {
        throw new Error('Cannot add a Note to the locked part of an instance')
      }
      const previousSelection = new Set(ctx.state.selectedIds)
      const note = ctx.graph.createNode('FRAME', parentId, { name: 'Note', ...position })
      initializeNote(ctx.graph, note, { definition: {}, content: '' })
      ctx.runLayoutForNode(note.id)
      pushCreatedSubtreesUndo(ctx, 'Create note', [note.id], previousSelection)
      ctx.setSelectedIds(new Set([note.id]))
      ctx.requestRender()
      return note
    })
  }

  return {
    createNote,
    ...createNoteComponentActions(ctx),
    ...createNoteColorActions(ctx, beginPreview),
    ...createNoteLayoutActions(ctx, beginPreview)
  }
}
