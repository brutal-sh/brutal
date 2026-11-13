import { isEqual } from 'es-toolkit'

import type { SceneGraph } from './graph'

function captureState(graph: SceneGraph) {
  return {
    nodeRefs: new Map(graph.nodes),
    variableRefs: new Map(graph.variables),
    collectionRefs: new Map(graph.variableCollections),
    // Official asset APIs replace buffers; retain originals without copying every bitmap.
    images: new Map(graph.images),
    snapshot: structuredClone({
      nodes: graph.nodes,
      variables: graph.variables,
      variableCollections: graph.variableCollections,
      activeMode: graph.activeMode,
      instanceIndex: graph.instanceIndex,
      connectorIds: graph.connectorIds,
      enabledLibraries: graph.enabledLibraries,
      rootId: graph.rootId,
      figKiwiVersion: graph.figKiwiVersion,
      figSchemaDeflated: graph.figSchemaDeflated,
      documentColorSpace: graph.documentColorSpace
    })
  }
}

type CheckpointState = ReturnType<typeof captureState>

function assertNodeIdentity(graph: SceneGraph, state: CheckpointState): void {
  for (const [id, before] of state.snapshot.nodes) {
    const after = graph.nodes.get(id)
    if (
      !after ||
      after !== state.nodeRefs.get(id) ||
      before.id !== after.id ||
      before.type !== after.type ||
      before.parentId !== after.parentId ||
      before.componentId !== after.componentId ||
      !isEqual(before.childIds, after.childIds)
    )
      throw new Error('Atomic tools must not change node hierarchy or identity')
  }
}

function assertVariableIdentity(graph: SceneGraph, state: CheckpointState): void {
  for (const [id, before] of state.snapshot.variables) {
    const after = graph.variables.get(id)
    if (
      !after ||
      after !== state.variableRefs.get(id) ||
      before.id !== after.id ||
      before.collectionId !== after.collectionId ||
      before.type !== after.type
    )
      throw new Error('Atomic tools must not change variable identity')
  }
}

function assertDocumentUnchanged(graph: SceneGraph, state: CheckpointState): void {
  const { snapshot, images } = state
  const collectionsChanged = [
    !isEqual(snapshot.variableCollections, graph.variableCollections),
    !isEqual(snapshot.activeMode, graph.activeMode),
    !isEqual(snapshot.instanceIndex, graph.instanceIndex),
    !isEqual(snapshot.connectorIds, graph.connectorIds),
    !isEqual(snapshot.enabledLibraries, graph.enabledLibraries)
  ].some(Boolean)
  const metadataChanged = [
    graph.rootId !== snapshot.rootId,
    graph.documentColorSpace !== snapshot.documentColorSpace,
    graph.figKiwiVersion !== snapshot.figKiwiVersion,
    !isEqual(graph.figSchemaDeflated, snapshot.figSchemaDeflated)
  ].some(Boolean)
  if (
    collectionsChanged ||
    metadataChanged ||
    images.size !== graph.images.size ||
    [...images].some(([id, bytes]) => graph.images.get(id) !== bytes)
  )
    throw new Error('Atomic tools must not change collections, assets or document metadata')
}

function assertPropertiesOnly(graph: SceneGraph, state: CheckpointState): void {
  if (
    state.snapshot.nodes.size !== graph.nodes.size ||
    state.snapshot.variables.size !== graph.variables.size
  )
    throw new Error('Atomic tools must not create or remove nodes or variables')
  assertNodeIdentity(graph, state)
  assertVariableIdentity(graph, state)
  assertDocumentUnchanged(graph, state)
}

function restoreCheckpoint(graph: SceneGraph, state: CheckpointState): void {
  const { snapshot } = state
  const failedNodes = new Map(graph.nodes)
  restoreObjects(graph.nodes, snapshot.nodes, state.nodeRefs)
  restoreObjects(graph.variables, snapshot.variables, state.variableRefs)
  restoreObjects(graph.variableCollections, snapshot.variableCollections, state.collectionRefs)
  restoreMap(graph.activeMode, structuredClone(snapshot.activeMode))
  restoreMap(graph.instanceIndex, structuredClone(snapshot.instanceIndex))
  restoreMap(graph.enabledLibraries, structuredClone(snapshot.enabledLibraries))
  restoreMap(graph.images, state.images)
  graph.connectorIds.clear()
  for (const id of snapshot.connectorIds) graph.connectorIds.add(id)
  graph.rootId = snapshot.rootId
  graph.figKiwiVersion = snapshot.figKiwiVersion
  graph.figSchemaDeflated = structuredClone(snapshot.figSchemaDeflated)
  graph.documentColorSpace = snapshot.documentColorSpace
  graph.clearAbsPosCache()
  // Notify consumers only after the complete hierarchy and indexes have been restored.
  for (const [id, node] of failedNodes) {
    if (!graph.nodes.has(id)) graph.emitter.emit('node:deleted', id, node.parentId)
  }
  for (const [id, node] of graph.nodes) {
    if (failedNodes.has(id)) graph.emitter.emit('node:updated', id, node)
    else graph.emitter.emit('node:created', node)
  }
}

/** Capture rollback state without changing graph or surviving object identities. */
export function captureGraphCheckpoint(graph: SceneGraph) {
  const state = captureState(graph)
  return {
    nodes: state.snapshot.nodes,
    variables: state.snapshot.variables,
    assertPropertiesOnly: () => assertPropertiesOnly(graph, state),
    restore: () => restoreCheckpoint(graph, state)
  }
}

function restoreObjects<T extends object>(
  target: Map<string, T>,
  snapshot: Map<string, T>,
  refs: Map<string, T>
) {
  target.clear()
  for (const [id, saved] of snapshot) {
    const original = refs.get(id)
    if (!original) throw new Error(`Missing checkpoint reference: ${id}`)
    for (const key of Object.keys(original) as (keyof T)[]) {
      if (!(key in saved)) Reflect.deleteProperty(original, key)
    }
    Object.assign(original, structuredClone(saved))
    target.set(id, original)
  }
}

function restoreMap<K, V>(target: Map<K, V>, saved: Map<K, V>) {
  target.clear()
  for (const [key, value] of saved) target.set(key, value)
}
