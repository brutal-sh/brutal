import { colorToFill } from '#scene-graph/color'
import type { SceneGraph } from '#scene-graph/graph'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '#scene-graph/plugin-data'
import type { SceneNode } from '#scene-graph/types'

import { noteForeground } from './appearance'
import { noteOfNode, noteBody } from './model'

/** Note instances inherit authored dimensions separately from their measured geometry. */
export function syncNoteFields(
  target: Pick<SceneNode, 'type' | 'pluginData'>,
  source: SceneNode,
  updates: Partial<SceneNode>,
  protectedField: (field: string) => boolean
): void {
  const own = noteOfNode(target)
  const inherited = noteOfNode(source)
  if (!own && !inherited) return
  updates.pluginData = withPluginData(
    updates.pluginData ?? target.pluginData,
    OPEN_PENCIL_PLUGIN_DATA.note,
    inherited
      ? {
          width: own && protectedField('width') ? own.width : inherited.width,
          height: own && protectedField('height') ? own.height : inherited.height
        }
      : undefined
  )
}

/** A Note's generated foreground follows its own background, including instance overrides. */
export function syncNoteBodyPaint(
  graph: SceneGraph,
  body: SceneNode,
  updates: Partial<SceneNode>
): void {
  const parent = body.parentId ? graph.getNode(body.parentId) : undefined
  if (!parent || noteBody(graph, parent)?.id !== body.id) return
  const binding = parent.boundVariables['fills/0/color']
  const background =
    (binding ? graph.resolveColorVariableForNode(parent.id, binding) : undefined) ??
    parent.fills.at(0)?.color
  if (background) updates.fills = [colorToFill(noteForeground(background))]
}

export function ownsNoteOverride(node: SceneNode, field: string): boolean {
  return node.type === 'INSTANCE' && !!noteOfNode(node) && node.instanceOverrides.self.has(field)
}
