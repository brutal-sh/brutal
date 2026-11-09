import { omit } from 'es-toolkit'

import type { PenImportDiagnostic } from '../compatibility'
import type { PenDocument, PenNode, PenOverride } from '../schema'
import { inspectNote } from './index'

export function noteReferenceSource(
  id: string | undefined,
  nodes: ReadonlyMap<string, PenNode>
): PenNode | undefined {
  const seen = new Set<string>()
  let node = id ? nodes.get(id) : undefined
  while (node?.type === 'ref' && !seen.has(node.id)) {
    seen.add(node.id)
    node = node.ref ? nodes.get(node.ref) : undefined
  }
  return node?.type === 'ref' ? undefined : node
}

function inspectReference(node: PenOverride, source: PenNode, doc: PenDocument, path: string) {
  const fields = omit(node, ['type', 'ref', 'descendants'])
  const diagnostics = inspectNote({ ...source, ...fields, type: 'note' }, doc, { path })
  if (node.reusable)
    diagnostics.push({
      code: 'unsupported-node',
      path,
      nodeId: node.id,
      message: 'Reusable Note refs are not yet supported.'
    })
  if (!source.reusable || Object.keys(node.descendants ?? {}).length > 0)
    diagnostics.push({
      code: 'unsupported-node',
      path,
      nodeId: node.id,
      message: 'A Note ref requires a reusable source and cannot override generated descendants.'
    })
  return diagnostics
}

/** Validate effective Note contracts before a ref or descendant override can discard fields. */
export function inspectNoteReferences(doc: PenDocument): PenImportDiagnostic[] {
  const pending = doc.children.map((node, index) => ({ node, path: `/children/${index}` }))
  for (const entry of pending)
    entry.node.children?.forEach((node, index) =>
      pending.push({ node, path: `${entry.path}/children/${index}` })
    )
  const nodes = new Map(pending.map(({ node }) => [node.id, node]))
  const diagnostics: PenImportDiagnostic[] = []
  const checks: { node: PenOverride; path: string }[] = [...pending]
  for (const { node, path } of checks) {
    const source = node.type === 'ref' ? noteReferenceSource(node.ref, nodes) : undefined
    if (source?.type === 'note') diagnostics.push(...inspectReference(node, source, doc, path))
    for (const [key, override] of Object.entries(node.descendants ?? {})) {
      checks.push({ node: override, path: `${path}/descendants/${key}` })
      if (override.type !== undefined) continue
      const original = noteReferenceSource(key.split('/').at(-1), nodes)
      if (original?.type !== 'note') continue
      const effective: PenOverride = { ...original, ...override }
      diagnostics.push(...inspectNote(effective, doc, { path: `${path}/descendants/${key}` }))
    }
  }
  return diagnostics
}
