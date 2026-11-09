// Child cloning and tree synchronization shared by instance creation, swap, and sync.
import { syncNoteBodyPaint, ownsNoteOverride } from '../generated/notes/instances'
import type { SceneGraph } from '../graph'
import { scriptOfNode } from '../scripts/model'
import { ownsSlotContent, slotPropertyId } from '../slots/frames'
import type { SceneNode } from '../types'
import { applyEnclosingAssignments, assignedFieldValues, propertyDrivenFields } from './assignments'
import { cloneChildInCoordinates, cloneChildrenWithMapping } from './clone'
import { keepOwnContentSize } from './content-size'
import {
  createInstanceSyncContext,
  hasUnplacedCopiesBelow,
  restoreRemovedCopy,
  unplacedCopy,
  type InstanceSyncContext
} from './copies'
import { ownsSelfFillField, sourceWithEffectiveFill } from './main-component'
import {
  copiedComponentLayerId,
  hasInstanceOverride as hasNodeInstanceOverride,
  setInstanceOverride,
  type InstanceOverrideState
} from './overrides'
import {
  bindingProtection,
  copySyncedFields,
  isProtectedSyncField,
  sourceInTargetCoordinates,
  syncBindingFields,
  updateSyncedProps
} from './properties'

export function enclosingInstanceOverrideFields(graph: SceneGraph, node: SceneNode): Set<string>[] {
  const fields: Set<string>[] = []
  let parent = node.parentId ? graph.nodes.get(node.parentId) : undefined
  while (parent) {
    if (parent.type === 'INSTANCE') {
      fields.push(new Set(parent.instanceOverrides.descendants.get(node.id)?.keys()))
    }
    parent = parent.parentId ? graph.nodes.get(parent.parentId) : undefined
  }
  return fields
}

function childBindingProtection(
  graph: SceneGraph,
  child: SceneNode,
  overrides: InstanceOverrideState
) {
  const fields = enclosingInstanceOverrideFields(graph, child)
  fields.push(new Set(overrides.descendants.get(child.id)?.keys()))
  const protectedField = bindingProtection(fields)
  return (field: string) =>
    protectedField(field) || ownsSelfFillField(child, field) || ownsNoteOverride(child, field)
}

function linkMatchedChild(
  overrides: InstanceOverrideState,
  instParentId: string,
  instChild: SceneNode,
  compChildId: string
): void {
  if (instChild.type === 'INSTANCE') {
    setInstanceOverride(overrides, instParentId, instChild.id, 'sourceComponentId', compChildId)
  } else {
    instChild.componentId = compChildId
  }
}

function matchFallbackChildren(
  graph: SceneGraph,
  compParent: SceneNode,
  instParent: SceneNode,
  instParentId: string,
  overrides: InstanceOverrideState,
  instChildMap: Map<string, SceneNode>,
  usedInstChildIds: Set<string>
): void {
  const fallbackByType = new Map<SceneNode['type'], Map<string, SceneNode[]>>()
  const remainingCandidateCount = new Map<SceneNode['type'], number>()
  const unmatchedComponentCount = new Map<SceneNode['type'], number>()
  for (const compChildId of compParent.childIds) {
    if (instChildMap.has(compChildId)) continue
    const child = graph.nodes.get(compChildId)
    if (child) {
      unmatchedComponentCount.set(child.type, (unmatchedComponentCount.get(child.type) ?? 0) + 1)
    }
  }
  for (const childId of instParent.childIds) {
    const child = graph.nodes.get(childId)
    if (!child || usedInstChildIds.has(child.id)) continue
    remainingCandidateCount.set(child.type, (remainingCandidateCount.get(child.type) ?? 0) + 1)
    let byName = fallbackByType.get(child.type)
    if (!byName) {
      byName = new Map()
      fallbackByType.set(child.type, byName)
    }
    const queue = byName.get(child.name)
    if (queue) queue.push(child)
    else byName.set(child.name, [child])
  }

  // Match by name and type with FIFO queues to preserve sibling order in linear time.
  for (const compChildId of compParent.childIds) {
    if (instChildMap.has(compChildId)) continue
    const compChild = graph.nodes.get(compChildId)
    if (!compChild) continue
    const candidatesByName = fallbackByType.get(compChild.type)
    const candidateCount = remainingCandidateCount.get(compChild.type) ?? 0
    if (candidateCount > (unmatchedComponentCount.get(compChild.type) ?? 0)) continue
    const match = candidatesByName?.get(compChild.name)?.shift()
    if (!match) continue
    remainingCandidateCount.set(compChild.type, candidateCount - 1)
    instChildMap.set(compChildId, match)
    usedInstChildIds.add(match.id)
    linkMatchedChild(overrides, instParentId, match, compChildId)
  }
}

function sortInstanceChildren(
  graph: SceneGraph,
  instParent: SceneNode,
  instParentId: string,
  compChildOrder: string[],
  overrides: InstanceOverrideState
): void {
  const orderMap = new Map<string, number>()
  for (let i = 0; i < compChildOrder.length; i++) orderMap.set(compChildOrder[i], i)

  const ranks = new Map<string, number>()
  for (let index = 0; index < instParent.childIds.length; index++) {
    const childId = instParent.childIds[index]
    const node = graph.nodes.get(childId)
    const mapped = node && copiedComponentLayerId(overrides, instParentId, node)
    const componentIndex = mapped ? orderMap.get(mapped) : undefined
    ranks.set(childId, componentIndex ?? compChildOrder.length + index)
  }
  const sorted = instParent.childIds.toSorted(
    (left, right) => (ranks.get(left) ?? 0) - (ranks.get(right) ?? 0)
  )
  // Move through the graph so the reorder is reported, as collaboration syncs it.
  sorted.forEach((childId, index) => {
    if (instParent.childIds[index] !== childId) graph.insertChildAt(childId, instParentId, index)
  })
}

/** True when syncing `compParentId` into `instParentId` would form a cycle. */
function isCyclicSync(graph: SceneGraph, compParentId: string, instParentId: string): boolean {
  return compParentId === instParentId || graph.isDescendant(instParentId, compParentId)
}

/** Children already linked to a component child by sourceComponentId or componentId. */
function matchLinkedChildren(
  graph: SceneGraph,
  instParent: SceneNode,
  instParentId: string,
  overrides: InstanceOverrideState,
  compChildIdSet: ReadonlySet<string>,
  instChildMap: Map<string, SceneNode>,
  usedInstChildIds: Set<string>
): void {
  for (const childId of instParent.childIds) {
    const child = graph.nodes.get(childId)
    if (!child) continue
    const mappedComponentId = copiedComponentLayerId(overrides, instParentId, child)
    if (mappedComponentId && compChildIdSet.has(mappedComponentId)) {
      instChildMap.set(mappedComponentId, child)
      usedInstChildIds.add(child.id)
    }
  }
}

/**
 * Pass 3 of a sync: bring along the copy of a layer moved here inside the component, bring back
 * one the sync removed when its layer returns, or clone a layer the instance has no copy of. A
 * clone takes its own subtree unless copies the instance has belong in it, which the recursion
 * moves in instead. Children left unmatched are the sync's to remove once it finishes.
 */
function placeMissingChildren(
  graph: SceneGraph,
  compParent: SceneNode,
  instParent: SceneNode,
  instChildMap: Map<string, SceneNode>,
  usedInstChildIds: Set<string>,
  context: InstanceSyncContext
): void {
  for (const child of instChildMap.values()) context.matched.add(child.id)

  for (const compChildId of compParent.childIds) {
    if (instChildMap.has(compChildId)) continue
    const moved =
      unplacedCopy(graph, context, compChildId, instParent.id) ??
      restoreRemovedCopy(graph, context, compChildId, instParent.id)
    if (moved) {
      graph.insertChildAt(moved.id, instParent.id, instParent.childIds.length)
      instChildMap.set(compChildId, moved)
      usedInstChildIds.add(moved.id)
      context.matched.add(moved.id)
      continue
    }
    const src = graph.nodes.get(compChildId)
    if (!src) continue
    const clone = cloneChildInCoordinates(graph, src, { source: compParent, target: instParent })
    if (src.childIds.length > 0 && !hasUnplacedCopiesBelow(graph, context, compChildId)) {
      cloneChildrenWithMapping(graph, compChildId, clone.id)
    }
    applyEnclosingAssignments(graph, clone)
    instChildMap.set(compChildId, clone)
    usedInstChildIds.add(clone.id)
    context.matched.add(clone.id)
  }
  for (const childId of instParent.childIds) {
    if (!usedInstChildIds.has(childId)) context.leftovers.add(childId)
  }
}

export function syncChildren(
  graph: SceneGraph,
  compParentId: string,
  instParentId: string,
  overrides: InstanceOverrideState,
  context: InstanceSyncContext = createInstanceSyncContext(instParentId, overrides)
): void {
  // An instance inside its own component would clone the component into itself without end.
  if (isCyclicSync(graph, compParentId, instParentId)) return

  const compParent = graph.nodes.get(compParentId)
  const instParent = graph.nodes.get(instParentId)
  if (!compParent || !instParent || scriptOfNode(compParent)) return

  const instChildMap = new Map<string, SceneNode>()
  const usedInstChildIds = new Set<string>()
  const compChildIdSet = new Set(compParent.childIds)

  // Pass 1: Direct matching via sourceComponentId or componentId
  matchLinkedChildren(
    graph,
    instParent,
    instParentId,
    overrides,
    compChildIdSet,
    instChildMap,
    usedInstChildIds
  )

  // Pass 2: Fallback matching for unmatched children (e.g. from Figma imports)
  matchFallbackChildren(
    graph,
    compParent,
    instParent,
    instParentId,
    overrides,
    instChildMap,
    usedInstChildIds
  )

  placeMissingChildren(graph, compParent, instParent, instChildMap, usedInstChildIds, context)

  // Pass 4: Synchronize properties and recurse
  for (const compChildId of compParent.childIds) {
    const compChild = graph.nodes.get(compChildId)
    const instChild = instChildMap.get(compChildId)
    if (!compChild || !instChild) continue

    const protectedField = childBindingProtection(graph, instChild, overrides)
    const driven = propertyDrivenFields(graph, instChild, compChild)
    const componentScale =
      (compChild.componentScale * instParent.componentScale) / compParent.componentScale
    const effectiveSource = sourceWithEffectiveFill(graph, compChild, instChild)
    const source = sourceInTargetCoordinates(effectiveSource, componentScale)
    // Which properties a layer serves is the component's to say; a slot or exposed layer
    // created on the component becomes one in every instance.
    const updates: Partial<SceneNode> = {
      componentScale,
      componentPropertyReferences: structuredClone(compChild.componentPropertyReferences)
    }
    syncBindingFields(instChild, source, updates, protectedField)
    const placement = copySyncedFields(updates, instChild, source, {
      compParent,
      instParent,
      factor: componentScale / compChild.componentScale,
      skip: (key) => driven.has(key) || isProtectedSyncField(instChild, key, protectedField)
    })
    Object.assign(updates, assignedFieldValues(graph, instChild, compChild))
    syncNoteBodyPaint(graph, instChild, updates)
    keepOwnContentSize(graph, updates, instChild, source, placement)
    updateSyncedProps(graph, instChild, updates)

    if (
      compChild.childIds.length > 0 &&
      !hasNodeInstanceOverride(overrides, instParentId, instChild.id, 'componentId') &&
      // The component's frame is the authority on which slot this is; instance copies of
      // its bindings are not synced.
      !ownsSlotContent(graph, instChild, slotPropertyId(compChild))
    ) {
      syncChildren(graph, compChildId, instChild.id, overrides, context)
    }
  }

  // Pass 5: Sort instance children to match component child order
  sortInstanceChildren(graph, instParent, instParentId, compParent.childIds, overrides)
}
