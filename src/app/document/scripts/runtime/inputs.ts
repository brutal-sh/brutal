import type { Editor } from '@open-pencil/core'
import type { ScriptInput } from '@open-pencil/core/scripts/header'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import {
  resolveScriptInputVariables,
  type ScriptDefinition
} from '@open-pencil/scene-graph/scripts'

export function scriptInputKey(editor: Editor, id: string, definition: ScriptDefinition) {
  const node = editor.graph.getNode(id)
  if (!node) return ''
  return JSON.stringify(
    Object.entries(definition.inputs).map(([name, value]) => {
      try {
        return [name, resolveScriptInputVariables(editor.graph, node, { [name]: value })[name]]
      } catch (error) {
        return [name, String(error)]
      }
    })
  )
}

export function declaredScriptInputs(
  graph: SceneGraph,
  node: SceneNode,
  definition: ScriptDefinition,
  definitions: ScriptInput[]
) {
  return resolveScriptInputVariables(
    graph,
    node,
    Object.fromEntries(
      Object.entries(definition.inputs).filter(([name]) =>
        definitions.some((input) => input.name === name)
      )
    )
  )
}
