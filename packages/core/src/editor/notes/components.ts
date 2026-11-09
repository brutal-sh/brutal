import type { SceneNode } from '@open-pencil/scene-graph'
import { noteBody, noteOfNode, isNoteInstanceCopy } from '@open-pencil/scene-graph/generated'
import { instanceMainComponent, recordInstanceOverride } from '@open-pencil/scene-graph/instances'
import { createInstanceOverrideState } from '@open-pencil/scene-graph/instances/overrides'

import { assertNodeEditable } from '#core/editor/capabilities'
import { restoreDocumentChange } from '#core/editor/history/document-change'
import { recordEdit } from '#core/editor/history/edit'
import type { EditorContext } from '#core/editor/types'

function recordDetach(ctx: EditorContext, label: string, run: () => void): void {
  const selection = new Set(ctx.state.selectedIds)
  recordEdit(
    ctx,
    {
      label,
      push: false,
      onRecorded(change) {
        const restore = (side: 'before' | 'after') => {
          restoreDocumentChange(ctx, change, side)
          ctx.setSelectedIds(new Set(selection))
        }
        ctx.undo.push({ label, forward: () => restore('after'), inverse: () => restore('before') })
      }
    },
    run
  )
}

function materializeNote(ctx: EditorContext, node: SceneNode, copied = false): void {
  const overrides = node.instanceOverrides
  ctx.graph.updateNode(node.id, {
    type: 'FRAME',
    componentId: copied ? node.componentId : null,
    instanceOverrides: createInstanceOverrideState()
  })
  const body = noteBody(ctx.graph, node)
  if (body && !copied) ctx.graph.updateNode(body.id, { componentId: null })
  // A materialized nested copy still owns its overrides inside the enclosing instance.
  if (copied) {
    recordInstanceOverride(ctx.graph, node.id, overrides.self.keys())
    for (const [id, fields] of overrides.descendants)
      recordInstanceOverride(ctx.graph, id, fields.keys())
  }
}

/** Generated Note bodies remain internal when an instance becomes an ordinary Note. */
export function detachNoteInstance(ctx: EditorContext, node: SceneNode): void {
  if (isNoteInstanceCopy(ctx.graph, node)) return
  assertNodeEditable(ctx.graph, node.id)
  recordDetach(ctx, 'Detach instance', () => materializeNote(ctx, node))
  ctx.setSelectedIds(new Set([node.id]))
  ctx.requestRender()
}

export function createNoteComponentActions(ctx: EditorContext) {
  function detachNoteComponent(id: string): void {
    const component = ctx.graph.getNode(id)
    if (component?.type !== 'COMPONENT' || !noteOfNode(component)) return
    const instances = [...ctx.graph.getAllNodes()].filter(
      (node) => node.type === 'INSTANCE' && instanceMainComponent(ctx.graph, node)?.id === id
    )
    for (const node of [component, ...instances]) assertNodeEditable(ctx.graph, node.id)
    const sourceIds = new Set(instances.map((node) => node.id))
    recordDetach(ctx, 'Detach component', () => {
      for (const instance of instances)
        materializeNote(ctx, instance, sourceIds.has(instance.componentId ?? ''))
      materializeNote(ctx, component)
    })
    ctx.requestRender()
  }
  return { detachNoteComponent }
}
