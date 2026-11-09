import { omit } from 'es-toolkit'

import type { PenDocument, PenNode, PenOverride } from '../schema'
import { noteReferenceSource } from './references'

function canonicalRef(node: PenOverride, nodes: ReadonlyMap<string, PenNode>): PenOverride {
  if (node.type !== 'ref' || noteReferenceSource(node.ref, nodes)?.type !== 'note') return node
  let result = { ...node }
  let parent = result.ref ? nodes.get(result.ref) : undefined
  const seen = new Set<string>()
  while (parent?.type === 'ref' && !seen.has(parent.id)) {
    seen.add(parent.id)
    result = {
      ...omit(parent, ['id', 'reusable']),
      ...result,
      ref: parent.ref
    }
    if (parent.theme || result.theme) result.theme = { ...parent.theme, ...result.theme }
    parent = parent.ref ? nodes.get(parent.ref) : undefined
  }
  return result
}

/** Canonical Note refs retain the source ref's own fields and point directly at its master. */
export function normalizeNoteReferences(doc: PenDocument): PenDocument {
  const pending = [...doc.children]
  for (const node of pending) pending.push(...(node.children ?? []))
  const nodes = new Map(pending.map((node) => [node.id, node]))
  function normalizeFields(node: PenOverride): PenOverride {
    const result = { ...canonicalRef(node, nodes) }
    if (result.children) result.children = result.children.map(normalizeNode)
    if (result.descendants)
      result.descendants = Object.fromEntries(
        Object.entries(result.descendants).map(([key, value]) => [key, normalizeFields(value)])
      )
    return result
  }
  function normalizeNode(node: PenNode): PenNode {
    return { ...normalizeFields(node), id: node.id, type: node.type }
  }
  return { ...doc, children: doc.children.map(normalizeNode) }
}
