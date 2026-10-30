import type { SceneNode } from '@open-pencil/scene-graph'
import { captureGraphCheckpoint } from '@open-pencil/scene-graph/checkpoint'
import Matrix from '@open-pencil/scene-graph/matrix'
import type { Vector } from '@open-pencil/scene-graph/primitives'
import { canRescaleNode, rescaleNodeChanges } from '@open-pencil/scene-graph/scaling'

import { createSceneGeometry, nodeOrientationMatrix } from '#core/geometry'

import { assertNodeEditable } from './capabilities'
import { recordEdit } from './history/edit'
import type { NodePreview } from './node-preview'
import { ReadOnlyDocumentError } from './read-only'
import type { EditorContext } from './types'

/** A proportional content edit, shared by the canvas handles and other editor clients. */
export function createScaleActions(
  ctx: EditorContext,
  beginPreview: (label: string) => NodePreview,
  updateNode: (id: string, changes: Partial<SceneNode>) => void
) {
  function beginScaleNodes(ids: readonly string[], anchor: Vector) {
    if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y))
      throw new TypeError('Scale anchor must be finite')
    const selected = new Set(ids)
    const roots = [...selected]
      .map((id) => {
        const node = ctx.graph.getNode(id)
        if (!node || !canRescaleNode(node) || node.locked)
          throw new Error('This layer cannot be scaled')
        assertNodeEditable(ctx.graph, id)
        return node
      })
      .filter(
        (node) =>
          !node.parentId || !ctx.graph.closest(node.parentId, (parent) => selected.has(parent.id))
      )
    const geometry = createSceneGeometry(ctx.graph)
    const originals = new Map<string, SceneNode>()
    const rootGeometry = new Map(
      roots.map((node) => {
        const parent = node.parentId ? ctx.graph.getNode(node.parentId) : undefined
        const inverse = parent ? Matrix.invert(geometry.worldMatrix(parent)) : Matrix.identity()
        if (!inverse) throw new Error('The parent transform cannot be inverted')
        return [node.id, { origin: geometry.toWorld(node, { x: 0, y: 0 }), inverse }]
      })
    )
    function collect(node: SceneNode) {
      if (originals.has(node.id)) return
      assertNodeEditable(ctx.graph, node.id)
      originals.set(node.id, structuredClone(node))
      for (const child of ctx.graph.getChildren(node.id)) collect(child)
    }
    for (const root of roots) collect(root)
    let preview = beginPreview('Scale')
    let changes: Array<{ id: string; next: Partial<SceneNode> }> = []
    return {
      get closed() {
        return preview.closed
      },
      update(scale: number) {
        if (preview.closed) return
        try {
          if (!Number.isFinite(scale) || scale < 0.01)
            throw new RangeError('Scale must be finite and at least 0.01')
          if (ctx.state.readOnly) throw new ReadOnlyDocumentError()
          if (scale === 1) {
            preview.cancel()
            preview = beginPreview('Scale')
            changes = []
            return
          }
          // Calculate every change from the gesture's originals before layout mutates any node.
          changes = [...originals].map(([id, node]) => {
            const root = rootGeometry.get(id)
            const next = rescaleNodeChanges(ctx.graph, node, scale, !root)
            if (root) {
              const position = Matrix.mapPoint(root.inverse, {
                x: anchor.x + (root.origin.x - anchor.x) * scale,
                y: anchor.y + (root.origin.y - anchor.y) * scale
              })
              const offset = Matrix.mapPoint(nodeOrientationMatrix({ ...node, ...next }), {
                x: 0,
                y: 0
              })
              next.x = position.x - offset.x
              next.y = position.y - offset.y
            }
            return { id, next }
          })
          for (const { id, next } of changes) preview.update(id, next)
        } catch (error) {
          preview.cancel()
          throw error
        }
      },
      commit() {
        if (preview.closed) return
        preview.cancel()
        if (changes.length === 0) return
        if (ctx.state.readOnly) throw new ReadOnlyDocumentError()
        // Commit from the original document. A layout or observer failure restores the entire
        // graph before history closes, including component synchronization outside the roots.
        const checkpoint = captureGraphCheckpoint(ctx.graph)
        recordEdit(ctx, { label: 'Scale' }, () => {
          try {
            for (const { id, next } of changes) {
              assertNodeEditable(ctx.graph, id)
              updateNode(id, next)
            }
          } catch (error) {
            checkpoint.restore()
            throw error
          } finally {
            ctx.requestRender()
          }
        })
      },
      cancel() {
        preview.cancel()
      }
    }
  }
  return { beginScaleNodes }
}
