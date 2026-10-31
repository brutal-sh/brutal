import { isEqual } from 'es-toolkit/predicate'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { createInstanceOverrideState } from '@open-pencil/scene-graph/instances/overrides'
import type { Size } from '@open-pencil/scene-graph/primitives'
import {
  hasCurrentScriptOutput,
  markScriptOutputCurrent,
  scriptOfNode,
  withScript,
  scriptDefinitionChanges,
  SCRIPT_INPUT_BINDING_PREFIX,
  type ScriptDefinition
} from '@open-pencil/scene-graph/scripts'

import { assertNodeEditable } from './capabilities'
import { prepareSlotEdits } from './components/slots'
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
    const changes = scriptDefinitionChanges(ctx.graph, node, definition)
    if (isEqual(scriptOfNode(node), definition) && !changes.boundVariables) return
    nodes.updateNodeWithUndo(id, changes, 'Set script')
  }

  function setScriptInputVariable(id: string, name: string, variableId: string): void {
    const node = ctx.graph.getNode(id)
    const definition = node && scriptOfNode(node)
    const variable = ctx.graph.variables.get(variableId)
    if (!node || !definition || !variable) return
    assertNodeEditable(ctx.graph, id)
    const next = { ...definition, inputs: { ...definition.inputs, [name]: `$${variable.name}` } }
    const changes = scriptDefinitionChanges(ctx.graph, node, next)
    nodes.updateNodeWithUndo(
      id,
      {
        ...changes,
        boundVariables: {
          ...(changes.boundVariables ?? node.boundVariables),
          [`${SCRIPT_INPUT_BINDING_PREFIX}${name}`]: variableId
        }
      },
      'Set script input variable'
    )
  }

  function detachScriptInstances(id: string) {
    for (const instance of ctx.graph.getInstances(id))
      ctx.graph.updateNode(instance.id, {
        type: 'FRAME',
        componentId: null,
        instanceOverrides: createInstanceOverrideState()
      })
  }

  function detachScriptComponent(id: string): void {
    const node = ctx.graph.getNode(id)
    if (node?.type !== 'COMPONENT' || !scriptOfNode(node)) return
    assertNodeEditable(ctx.graph, id)
    recordEdit(ctx, { label: 'Detach component' }, () => {
      detachScriptInstances(id)
      ctx.graph.updateNode(id, { type: 'FRAME' })
    })
    ctx.requestRender()
  }

  function convertScriptToLayers(id: string): string | undefined {
    const node = ctx.graph.getNode(id)
    if (!node?.parentId || !scriptOfNode(node)) return undefined
    assertNodeEditable(ctx.graph, id)
    if (scriptOfNode(node)?.uri && !hasCurrentScriptOutput(ctx.graph, node))
      throw new Error('Regenerate the current script successfully before converting to layers.')
    const parentId = node.parentId
    const index = ctx.graph.getNode(parentId)?.childIds.indexOf(id) ?? 0
    const converted = ctx.undo.runBatch('Convert script to layers', () =>
      recordEdit(ctx, { label: 'Convert script to layers' }, () => {
        if (!prepareSlotEdits(ctx, [parentId])) return undefined
        const frame = ctx.graph.cloneTree(id, parentId, {
          type: 'FRAME',
          componentId: null,
          instanceOverrides: createInstanceOverrideState(),
          name: node.name === 'Script' ? 'Frame' : node.name,
          pluginData: withScript(node, undefined),
          boundVariables: Object.fromEntries(
            Object.entries(node.boundVariables).filter(
              ([field]) => !field.startsWith(SCRIPT_INPUT_BINDING_PREFIX)
            )
          ),
          status: node.status
        })
        if (!frame) return undefined
        if (!scriptOfNode(node)?.uri)
          for (const childId of Array.from(frame.childIds)) ctx.graph.deleteNode(childId)
        ctx.graph.insertChildAt(frame.id, parentId, index)
        if (node.type === 'COMPONENT') detachScriptInstances(id)
        ctx.graph.deleteNode(id)
        ctx.setSelectedIds(new Set([frame.id]))
        return frame.id
      })
    )
    ctx.requestRender()
    return converted
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
    ctx.graph.applyImportedStateDuring(() => {
      for (const childId of Array.from(node.childIds)) ctx.graph.deleteNode(childId)
      for (const page of output.getPages())
        for (const child of output.getChildren(page.id))
          ctx.graph.cloneTree(child.id, id, {}, output)
      for (const [hash, bytes] of output.images) ctx.graph.images.set(hash, bytes)
    })
    markScriptOutputCurrent(ctx.graph, id, true)
    ctx.requestRender()
    return true
  }

  return {
    createScript,
    setScriptDefinition,
    setScriptInputVariable,
    detachScriptComponent,
    convertScriptToLayers,
    replaceScriptOutput
  }
}
