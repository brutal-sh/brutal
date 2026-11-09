import { isEqual, omit } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'
import { noteBody } from '@open-pencil/scene-graph/generated'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { resolvedPaintBindings } from '@open-pencil/scene-graph/variables'

import type { NodePreview } from '#core/editor/node-preview'
import type { EditorContext } from '#core/editor/types'

function colorChanges(
  graph: SceneGraph,
  note: SceneNode,
  color: Color
): Partial<SceneNode> | undefined {
  const fill = (resolvedPaintBindings(graph, note).fills ?? note.fills).at(0)
  const current = fill ? { ...fill.color, a: fill.opacity } : undefined
  if (isEqual(current, color)) return undefined
  return {
    fills: [colorToFill(color)],
    boundVariables: omit(note.boundVariables, ['fills/0/color']),
    variableBindingScales: omit(note.variableBindingScales, ['fills/0/color'])
  }
}

export function createNoteColorActions(
  ctx: EditorContext,
  beginPreview: (label: string) => NodePreview
) {
  /** Own the whole paint gesture, including foreground layout and variable detachment. */
  function beginNoteColorPreview(ids: Iterable<string>) {
    const graph = ctx.graph
    const targets = [...ids]
    const preview = beginPreview('Change note color')
    return {
      get closed() {
        return preview.closed
      },
      update(color: Color) {
        if (preview.closed || ctx.graph !== graph) return
        for (const id of targets) {
          const note = graph.getNode(id)
          if (!note || !noteBody(graph, note)) continue
          const changes = colorChanges(graph, note, color)
          if (changes) preview.update(id, changes)
        }
      },
      commit: preview.commit,
      cancel: preview.cancel
    }
  }

  function setNoteColor(ids: Iterable<string>, color: Color) {
    const preview = beginNoteColorPreview(ids)
    try {
      preview.update(color)
      preview.commit()
    } catch (error) {
      preview.cancel()
      throw error
    }
  }

  return { beginNoteColorPreview, setNoteColor }
}
