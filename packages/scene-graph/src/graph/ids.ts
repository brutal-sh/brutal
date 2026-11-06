import type { SceneGraph } from '../graph'

type EntityIds = Pick<SceneGraph, 'nodes' | 'variables' | 'variableCollections' | 'isEntityIdTaken'>

export function generateUnusedEntityId(
  graph: EntityIds,
  generate: () => string,
  issued?: Set<string>
): string {
  let limit = Infinity
  for (let attempt = 0; attempt < limit; attempt++) {
    const id = generate()
    if (graph.isEntityIdTaken(id) || issued?.has(id)) {
      if (limit === Infinity) limit = entityIdCount(graph) + (issued?.size ?? 0) + 1
      continue
    }
    issued?.add(id)
    return id
  }
  throw new Error('The ID generator only returned IDs that are in use')
}

function entityIdCount(graph: EntityIds): number {
  let count = graph.nodes.size + graph.variables.size + graph.variableCollections.size
  for (const collection of graph.variableCollections.values()) count += collection.modes.length
  return count
}

export function entityIdTaken(graph: EntityIds, id: string): boolean {
  if (graph.nodes.has(id) || graph.variables.has(id) || graph.variableCollections.has(id))
    return true
  // Callers replace collection maps and edit `modes` in place (history snapshots, transfer,
  // undo), so an index of mode IDs would go stale; walk them without allocating instead.
  for (const collection of graph.variableCollections.values()) {
    for (const mode of collection.modes) if (mode.modeId === id) return true
  }
  return false
}
