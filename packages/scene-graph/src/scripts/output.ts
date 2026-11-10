import { visibleSubtree } from '#scene-graph/graph/visible-subtree'
import { isEqual } from 'es-toolkit/predicate'

import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'
import { scriptOfNode } from './model'
import type { ScriptDefinition } from './schema'

interface ScriptOutputState {
  definition: ScriptDefinition
  width: number
  height: number
  diagnostic: boolean
  componentId: SceneNode['componentId']
  childIds: string[]
}

// Execution readiness belongs to this process, never to a file an untrusted author can forge.
const outputs = new WeakMap<SceneGraph, Map<string, ScriptOutputState>>()

export function hasCurrentScriptOutput(graph: SceneGraph, node: SceneNode): boolean {
  const state = outputs.get(graph)?.get(node.id)
  return !state?.diagnostic && isCurrentPresentation(state, node)
}

function isCurrentPresentation(state: ScriptOutputState | undefined, node: SceneNode): boolean {
  return (
    !!state &&
    state.width === node.width &&
    state.height === node.height &&
    state.componentId === node.componentId &&
    isEqual(state.childIds, node.childIds) &&
    isEqual(state.definition, scriptOfNode(node))
  )
}

/** A diagnostic can be exported, but cannot be converted as successful generated content. */
export function markScriptOutputCurrent(
  graph: SceneGraph,
  id: string,
  current: boolean | 'diagnostic'
): void {
  if (!current) {
    outputs.get(graph)?.delete(id)
    return
  }
  const node = graph.getNode(id)
  const definition = node && scriptOfNode(node)
  if (!node || !definition) return
  let states = outputs.get(graph)
  if (!states) {
    states = new Map()
    outputs.set(graph, states)
    const retainedStates = states
    graph.onNodeEvents({ deleted: (deleted) => retainedStates.delete(deleted) })
  }
  states.set(id, {
    definition: structuredClone(definition),
    width: node.width,
    height: node.height,
    diagnostic: current === 'diagnostic',
    componentId: node.componentId,
    childIds: [...node.childIds]
  })
}

/** An exact export-graph copy retains the output its source already validated. */
export function copyScriptOutputState(
  source: SceneGraph,
  target: SceneGraph,
  ids: Iterable<string>
) {
  for (const id of ids) {
    const node = source.getNode(id)
    const state = outputs.get(source)?.get(id)
    if (node && isCurrentPresentation(state, node))
      markScriptOutputCurrent(target, id, state?.diagnostic ? 'diagnostic' : true)
  }
}

/** Refuse snapshots of missing/stale Script output rather than silently exporting blank or old layers. */
export function assertScriptOutputs(graph: SceneGraph, nodeIds: readonly string[]) {
  for (const node of visibleSubtree(graph, nodeIds)) {
    const script = graph.closest(node.id, (ancestor) => !!scriptOfNode(ancestor))
    if (script && !isCurrentPresentation(outputs.get(graph)?.get(script.id), script))
      throw new Error(
        `Script “${script.name}” has no current generated output. Regenerate it in the editor before exporting.`
      )
  }
}
