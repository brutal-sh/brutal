import { isEqual } from 'es-toolkit/predicate'

import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'
import { scriptOfNode } from './model'
import type { ScriptDefinition } from './schema'

interface ScriptOutputState {
  definition: ScriptDefinition
  width: number
  height: number
}

// Execution readiness belongs to this process, never to a file an untrusted author can forge.
const outputs = new WeakMap<SceneGraph, Map<string, ScriptOutputState>>()

export function hasCurrentScriptOutput(graph: SceneGraph, node: SceneNode): boolean {
  const state = outputs.get(graph)?.get(node.id)
  return (
    !!state &&
    state.width === node.width &&
    state.height === node.height &&
    isEqual(state.definition, scriptOfNode(node))
  )
}

export function markScriptOutputCurrent(graph: SceneGraph, id: string, current: boolean): void {
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
    height: node.height
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
    if (node && hasCurrentScriptOutput(source, node)) markScriptOutputCurrent(target, id, true)
  }
}

/** Refuse snapshots of missing/stale Script output rather than silently exporting blank or old layers. */
export function assertScriptOutputs(graph: SceneGraph, nodeIds: readonly string[]) {
  const pending = [...nodeIds]
  const seen = new Set<string>()
  for (const id of pending) {
    if (seen.has(id)) continue
    seen.add(id)
    const node = graph.getNode(id)
    if (!node?.visible || node.opacity <= 0) continue
    const script = graph.closest(node.id, (ancestor) => !!scriptOfNode(ancestor))
    if (script && !hasCurrentScriptOutput(graph, script))
      throw new Error(
        `Script “${script.name}” has no current generated output. Regenerate it in the editor before exporting.`
      )
    pending.push(...node.childIds)
  }
}
