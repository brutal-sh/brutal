import { stringToGuid } from '@open-pencil/kiwi/fig/guid'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { GUID } from '@open-pencil/scene-graph/primitives'

import { parseGuidOrNull, type KiwiNodeChange, type SceneNodeToKiwiContext } from './context'

/** Resolve effect variable asset refs when the Kiwi effect schema requires GUID aliases. */
export function buildAssetRefToVarGuidMap(
  graph: SceneGraph,
  varIdToGuid: Map<string, GUID>
): Map<string, GUID> {
  const map = new Map<string, GUID>()
  for (const [varId, variable] of graph.variables) {
    if (!variable.key) continue
    const guid = varIdToGuid.get(varId) ?? stringToGuid(varId)
    map.set(variable.key, guid)
    if (variable.version) map.set(`${variable.key}@${variable.version}`, guid)
  }
  return map
}

function serializeVariableModes(
  node: SceneNode,
  variableIdToGuid?: Map<string, GUID>,
  modeIdToGuid?: Map<string, GUID>
): NonNullable<KiwiNodeChange['variableModeBySetMap']> | undefined {
  const entries = Object.entries(node.variableModes).flatMap(([collectionId, modeId]) => {
    const collectionGuid = variableIdToGuid?.get(collectionId) ?? parseGuidOrNull(collectionId)
    const modeGuid = modeIdToGuid?.get(modeId) ?? parseGuidOrNull(modeId)
    if (!collectionGuid || !modeGuid) return []
    return [{ variableSetID: { guid: collectionGuid }, variableModeID: modeGuid }]
  })
  return entries.length > 0 ? { entries } : undefined
}

export function applyVariableModes(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  record: KiwiNodeChange
): void {
  const modes = serializeVariableModes(node, context.varIdToGuid, context.modeIdToGuid)
  if (modes) record.variableModeBySetMap = modes
}
