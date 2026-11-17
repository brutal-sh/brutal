import type { SceneNode } from '@open-pencil/scene-graph'
import { siblingOrderKeys } from '@open-pencil/scene-graph/order-keys'

import type { SceneNodeToKiwiContext } from './context'

const siblingOrderKeyCache = new WeakMap<object, Map<string, { keyById: Map<string, string> }>>()

/**
 * A layer's `parentIndex.position`: its imported key where that still orders it after the
 * previous sibling, otherwise a key between its neighbours, so a round trip keeps the keys
 * Figma wrote instead of renumbering every sibling.
 *
 * Canvas children are excluded. Shared styles and variable records are written to the
 * internal canvas by other passes that continue the keys already there, and an imported
 * key would collide with them, so those keep the caller's running index.
 */
export function exportOrderKey(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  childIndex: number
): string {
  const decided = context.orderKeys?.get(node.id)
  if (decided) return decided
  const parentId = node.parentId
  if (!parentId) return context.fractionalPosition(childIndex)
  const parent = context.graph.getNode(parentId)
  if (!parent || parent.type === 'CANVAS') return context.fractionalPosition(childIndex)
  let cache = siblingOrderKeyCache.get(context)
  if (!cache) {
    cache = new Map()
    siblingOrderKeyCache.set(context, cache)
  }
  let entry = cache.get(parentId)
  if (!entry) {
    const siblings = context.graph.getChildren(parentId).filter((child) => !child.internalOnly)
    const keys = siblingOrderKeys(siblings.map((sibling) => sibling.source.orderKey))
    // Keyed by id: this runs once per child, so a scan per child would cost the parent O(n²).
    entry = { keyById: new Map(siblings.map((sibling, index) => [sibling.id, keys[index]])) }
    cache.set(parentId, entry)
  }
  return entry.keyById.get(node.id) ?? context.fractionalPosition(childIndex)
}
