import { OPEN_PENCIL_PLUGIN_DATA, readPluginData, withPluginData } from '../plugin-data'
import type { SceneNode } from '../types'
import type { ScriptDefinition } from './schema'

/** A Script uses a frame for geometry and its own authored source/inputs in plugin data. */
export function scriptOfNode(
  node: Pick<SceneNode, 'type'> & Partial<Pick<SceneNode, 'pluginData'>>
): ScriptDefinition | undefined {
  return node.type === 'FRAME'
    ? readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.script)
    : undefined
}

export function withScript(
  node: Pick<SceneNode, 'pluginData'>,
  script: ScriptDefinition | undefined
) {
  return withPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.script, script)
}
