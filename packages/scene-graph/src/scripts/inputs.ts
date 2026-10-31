import { isEqual } from 'es-toolkit/predicate'

import { colorToHex8 } from '../color'
import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'
import { SCRIPT_INPUT_BINDING_PREFIX, scriptOfNode, withScript } from './model'
import type { ScriptDefinition, ScriptValue } from './schema'

/** Keep input bindings as graph identities while .pen stores their public variable names. */
export function scriptInputVariable(graph: SceneGraph, node: SceneNode, name: string) {
  const value = scriptOfNode(node)?.inputs[name]
  if (typeof value !== 'string' || !value.startsWith('$') || value.length < 2) return undefined
  const bound = node.boundVariables[`${SCRIPT_INPUT_BINDING_PREFIX}${name}`]
  if (bound) return graph.variables.get(bound)
  const matches = [...graph.variables.values()].filter(
    (variable) => variable.name === value.slice(1)
  )
  return matches.length === 1 ? matches[0] : undefined
}

/** Resolve in the Script's inherited theme; only scalar values reach the worker. */
export function resolveScriptInputVariables(
  graph: SceneGraph,
  node: SceneNode,
  values: Readonly<Record<string, ScriptValue>>
): Record<string, ScriptValue> {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      if (typeof value !== 'string') return [name, value]
      if (value.startsWith('\\$')) return [name, value.slice(1)]
      if (!value.startsWith('$') || value.length < 2) return [name, value]
      const variable = scriptInputVariable(graph, node, name)
      if (!variable)
        throw new Error(`Script input ${name} references a missing or ambiguous variable.`)
      const resolved = graph.resolveVariableForNode(node.id, variable.id)
      if (resolved === undefined) throw new Error(`Script input ${name} has no variable value.`)
      return [name, typeof resolved === 'object' ? colorToHex8(resolved) : resolved]
    })
  )
}

/** An ordinary edit or preview updates authored input and its variable identity together. */
export function scriptDefinitionChanges(
  graph: SceneGraph,
  node: SceneNode,
  definition: ScriptDefinition
) {
  const previous = scriptOfNode(node)
  const boundVariables = Object.fromEntries(
    Object.entries(node.boundVariables).filter(
      ([field]) => !field.startsWith(SCRIPT_INPUT_BINDING_PREFIX)
    )
  )
  for (const [name, value] of Object.entries(definition.inputs)) {
    if (typeof value !== 'string' || !value.startsWith('$') || value.length < 2) continue
    const field = `${SCRIPT_INPUT_BINDING_PREFIX}${name}`
    const bound = previous?.inputs[name] === value ? node.boundVariables[field] : undefined
    const matches = [...graph.variables.values()].filter(
      (variable) => variable.name === value.slice(1)
    )
    const id = bound ?? (matches.length === 1 ? matches[0].id : undefined)
    if (id) boundVariables[field] = id
  }
  return {
    pluginData: withScript(node, definition),
    ...(isEqual(node.boundVariables, boundVariables) ? {} : { boundVariables })
  }
}
