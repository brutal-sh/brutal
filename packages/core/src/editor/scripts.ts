import { isEqual } from 'es-toolkit/predicate'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { cloneNodeProps } from '@open-pencil/scene-graph/copy'
import type { Size } from '@open-pencil/scene-graph/primitives'
import {
  hasCurrentScriptOutput,
  markScriptOutputCurrent,
  scriptOfNode,
  withScript,
  type ScriptDefinition
} from '@open-pencil/scene-graph/scripts'

import { assertNodeEditable } from './capabilities'
import { recordEdit } from './history/edit'
import type { EditorContext } from './types'

interface ScriptNodeActions {
  createShape(
    type: SceneNode['type'],
    x: number,
    y: number,
    width: number,
    height: number,
    parentId?: string,
    name?: string
  ): string
  updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label?: string): void
}

/** Authored Script edits share ordinary node history; generated output does not add steps. */
export function createScriptActions(ctx: EditorContext, nodes: ScriptNodeActions) {
  function createScript(x: number, y: number, parentId?: string): string {
    const id = nodes.createShape('FRAME', x, y, 200, 200, parentId, 'Script')
    const node = ctx.graph.getNode(id)
    if (node)
      ctx.graph.updateNode(id, {
        fills: [],
        clipsContent: false,
        pluginData: withScript(node, { uri: '', inputs: {} })
      })
    return id
  }

  function setScriptDefinition(id: string, definition: ScriptDefinition): void {
    const node = ctx.graph.getNode(id)
    if (!node || !scriptOfNode(node)) return
    assertNodeEditable(ctx.graph, id)
    if (isEqual(scriptOfNode(node), definition)) return
    nodes.updateNodeWithUndo(id, { pluginData: withScript(node, definition) }, 'Set script')
  }

  function convertScriptToLayers(id: string): void {
    const node = ctx.graph.getNode(id)
    if (!node || !scriptOfNode(node)) return
    assertNodeEditable(ctx.graph, id)
    if (scriptOfNode(node)?.uri && !hasCurrentScriptOutput(ctx.graph, node))
      throw new Error('Regenerate the current script successfully before converting to layers.')
    recordEdit(ctx, { label: 'Convert script to layers' }, () => {
      if (!scriptOfNode(node)?.uri)
        for (const childId of Array.from(node.childIds)) ctx.graph.deleteNode(childId)
      ctx.graph.updateNode(id, {
        name: node.name === 'Script' ? 'Frame' : node.name,
        pluginData: withScript(node, undefined)
      })
    })
    ctx.requestRender()
  }

  function replaceScriptOutput(
    id: string,
    expected: ScriptDefinition,
    size: Size,
    output: SceneGraph
  ): boolean {
    const node = ctx.graph.getNode(id)
    if (
      !node ||
      !isEqual(scriptOfNode(node), expected) ||
      node.width !== size.width ||
      node.height !== size.height
    )
      return false
    const copy = (source: SceneNode, parentId: string) => {
      const created = ctx.graph.createNode(source.type, parentId, cloneNodeProps(source, null))
      for (const child of output.getChildren(source.id)) copy(child, created.id)
    }
    ctx.graph.applyImportedStateDuring(() => {
      for (const childId of Array.from(node.childIds)) ctx.graph.deleteNode(childId)
      for (const page of output.getPages())
        for (const child of output.getChildren(page.id)) copy(child, id)
      for (const [hash, bytes] of output.images) ctx.graph.images.set(hash, bytes)
    })
    markScriptOutputCurrent(ctx.graph, id, true)
    ctx.requestRender()
    return true
  }

  return { createScript, setScriptDefinition, convertScriptToLayers, replaceScriptOutput }
}
