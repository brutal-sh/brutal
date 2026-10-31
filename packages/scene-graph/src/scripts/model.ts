import { isEqual } from 'es-toolkit/predicate'

import { OPEN_PENCIL_PLUGIN_DATA, readPluginData, withPluginData } from '../plugin-data'
import type { SceneNode } from '../types'
import type { ScriptDefinition } from './schema'

export const SCRIPT_INPUT_BINDING_PREFIX = 'script/inputs/'

/** A Script uses a frame for geometry and its own authored source/inputs in plugin data. */
export function scriptOfNode(
  node: Pick<SceneNode, 'type'> & Partial<Pick<SceneNode, 'pluginData'>>
): ScriptDefinition | undefined {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
    ? readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.script)
    : undefined
}

export function withScript(
  node: Pick<SceneNode, 'pluginData'>,
  script: ScriptDefinition | undefined
) {
  return withPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.script, script)
}

/** Source and inputs are independent overrides; unrelated plugin data stays local. */
export const SCRIPT_OVERRIDE_FIELDS = ['script/uri', 'script/inputs'] as const

export function scriptChangedFields(node: SceneNode, changes: Partial<SceneNode>): string[] {
  if (!changes.pluginData && !changes.boundVariables) return []
  const before = scriptOfNode(node)
  const after = scriptOfNode({ ...node, ...changes })
  const bindings = (values: SceneNode['boundVariables']) =>
    Object.fromEntries(
      Object.entries(values).filter(([field]) => field.startsWith(SCRIPT_INPUT_BINDING_PREFIX))
    )
  const inputBindingChanged =
    !!(before || after) &&
    !isEqual(bindings(node.boundVariables), bindings(changes.boundVariables ?? node.boundVariables))
  return SCRIPT_OVERRIDE_FIELDS.filter((field) =>
    field === 'script/uri'
      ? before?.uri !== after?.uri
      : !isEqual(before?.inputs, after?.inputs) || inputBindingChanged
  )
}

export function withSyncedScript(
  target: Pick<SceneNode, 'type' | 'pluginData'>,
  source: SceneNode,
  protectedField: (field: string) => boolean
) {
  const own = scriptOfNode(target)
  const inherited = scriptOfNode(source)
  return withScript(
    target,
    inherited
      ? {
          uri: own && protectedField('script/uri') ? own.uri : inherited.uri,
          inputs: structuredClone(
            own && protectedField('script/inputs') ? own.inputs : inherited.inputs
          )
        }
      : undefined
  )
}

/** Apply Script inheritance without copying other plugin content or generated children. */
export function syncScriptFields(
  target: SceneNode,
  source: SceneNode,
  updates: Partial<SceneNode>,
  protectedField: (field: string) => boolean
): void {
  if (scriptOfNode(target) || scriptOfNode(source))
    updates.pluginData = withSyncedScript(
      { ...target, pluginData: updates.pluginData ?? target.pluginData },
      source,
      protectedField
    )
}
