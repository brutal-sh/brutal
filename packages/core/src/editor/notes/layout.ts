import { noteOfNode } from '@open-pencil/scene-graph/generated'

import type { NodePreview } from '#core/editor/node-preview'
import { wrapInAutoLayout } from '#core/editor/structure/auto-layout-wrap'
import { nextNumberedName } from '#core/editor/structure/rename'
import type { EditorContext } from '#core/editor/types'

const NOTE_LAYOUT_PADDING = 10

export function createNoteLayoutActions(
  ctx: EditorContext,
  beginPreview: (label: string) => NodePreview
) {
  function wrapNoteInAutoLayout() {
    const [id] = ctx.state.selectedIds
    const note = id ? ctx.graph.getNode(id) : undefined
    if (ctx.state.selectedIds.size !== 1 || !note || !noteOfNode(note)) return null
    return ctx.undo.runBatch('Add note flex layout', () => {
      const frameId = wrapInAutoLayout(ctx, [note], false, true)
      const frame = frameId ? ctx.graph.getNode(frameId) : undefined
      if (!frame?.parentId) return null
      const preview = beginPreview('Add note flex layout')
      try {
        preview.update(frame.id, {
          name: nextNumberedName(ctx.graph, frame.parentId, 'Frame'),
          x: frame.x - NOTE_LAYOUT_PADDING,
          y: frame.y - NOTE_LAYOUT_PADDING,
          paddingTop: NOTE_LAYOUT_PADDING,
          paddingRight: NOTE_LAYOUT_PADDING,
          paddingBottom: NOTE_LAYOUT_PADDING,
          paddingLeft: NOTE_LAYOUT_PADDING,
          itemSpacing: 10
        })
        preview.commit()
      } catch (error) {
        preview.cancel()
        throw error
      }
      ctx.requestRender()
      return frame.id
    })
  }
  return { wrapNoteInAutoLayout }
}
