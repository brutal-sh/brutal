import { pick } from 'es-toolkit/object'

import {
  writePenDocument,
  parsePenDocument,
  type PenDocument,
  type PenNode,
  type PenOverride
} from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { nodeImageHashes } from '@open-pencil/scene-graph/images'
import { canCreateInstance } from '@open-pencil/scene-graph/instances'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'

import { extractExportGraph } from '#core/io/subgraph'
import { validateStructuredData } from '#core/validation/structured-data'

import { SCRIPT_LIMITS } from './limits'

/** Materialize only referenced document components; the sandbox never receives their contents. */
export function scriptReferenceDocument(
  source: SceneGraph,
  ownerId: string,
  nodes: PenNode[],
  dependencies = new Set<string>()
) {
  const references = new Set<string>()
  const assets = new Set<string>()
  const budget = { elements: 0, bytes: 0 }
  let count = 0
  const inspect = (node: PenOverride) => {
    if (++count > 1_000) throw new Error('A script can generate at most 1,000 expanded nodes.')
    if (node.type === 'ref') {
      if (node.ref) dependencies.add(node.ref)
      if (!node.ref || !canCreateInstance(source, node.ref, ownerId))
        throw new Error('Script reference is missing, unavailable or cyclic.')
      references.add(node.ref)
      const visit = (id: string, root = false) => {
        dependencies.add(id)
        const layer = source.getNode(id)
        if (!layer || scriptOfNode(layer))
          throw new Error('Script references to generated Script components are not supported yet.')
        if (!root && ++count > SCRIPT_LIMITS.elements)
          throw new Error('A script can generate at most 1,000 expanded nodes.')
        validateStructuredData(
          pick(layer, [
            'name',
            'text',
            'pluginData',
            'fills',
            'strokes',
            'effects',
            'vectorNetwork',
            'fillGeometry',
            'strokeGeometry',
            'styleRuns',
            'textDecorationFills'
          ]),
          SCRIPT_LIMITS,
          budget,
          // Restored graph paints contain optional undefined fields; sandbox output remains strict.
          true
        )
        for (const hash of nodeImageHashes(layer)) {
          if (assets.has(hash)) continue
          assets.add(hash)
          const length = Math.ceil((source.images.get(hash)?.byteLength ?? 0) / 3) * 4 + 32
          if (length > SCRIPT_LIMITS.stringLength)
            throw new Error('Script reference image is too large.')
          budget.bytes += length
          if (budget.bytes > SCRIPT_LIMITS.outputBytes)
            throw new Error('Script reference context is too large.')
        }
        for (const child of layer.childIds) visit(child)
      }
      visit(node.ref, true)
    }
    for (const child of node.children ?? []) inspect(child)
    for (const child of Object.values(node.descendants ?? {})) inspect(child)
  }
  for (const node of nodes) inspect(node)
  const penDocument: PenDocument = { version: '2.21', children: nodes }
  if (!references.size) return { penDocument, dependencies }

  const { graph } = extractExportGraph(source, { scope: 'selection', nodeIds: [...references] })
  // shortcut: variable identity across reference materialization is refused, extend with variable/theme Script support.
  if (graph.variables.size)
    throw new Error('Script references with variable bindings are not supported yet.')
  const required = new Set(references)
  for (const node of graph.getAllNodes())
    if (node.type === 'INSTANCE' && node.componentId) required.add(node.componentId)
  const roots = [...required].filter((id) => {
    const node = graph.getNode(id)
    return !node?.parentId || !graph.closest(node.parentId, (parent) => required.has(parent.id))
  })
  const page = graph.getPages().at(0)
  if (!page) throw new Error('Missing Script component context.')
  for (const id of roots) graph.reparentNode(id, page.id)
  for (const other of graph.getPages()) {
    for (const child of other.childIds)
      if (other.id !== page.id || !roots.includes(child)) graph.deleteNode(child)
    if (other.id !== page.id) graph.deleteNode(other.id)
  }
  graph.updateNode(graph.rootId, { pluginData: [] })
  graph.updateNode(page.id, {
    pluginData: [],
    fills: [],
    strokes: [],
    effects: [],
    layoutMode: 'NONE'
  })
  for (const node of graph.getAllNodes())
    if (node.type !== 'CANVAS' && node.id !== graph.rootId) dependencies.add(node.id)
  const definitions = writePenDocument(graph).children
  const dependencyId = `script-dependencies-${crypto.randomUUID()}`
  const prefix = crypto.randomUUID()
  let sequence = 0
  const identify = (node: PenNode): PenNode => ({
    ...node,
    id: `script-${prefix}-${sequence++}`,
    ...(node.children ? { children: node.children.map(identify) } : {})
  })
  penDocument.children = [
    {
      type: 'frame',
      id: dependencyId,
      name: 'Script component context',
      enabled: false,
      layout: 'none',
      width: 0,
      height: 0,
      children: definitions
    },
    ...nodes.map(identify)
  ]
  const serialized = JSON.stringify(penDocument)
  if (new TextEncoder().encode(serialized).byteLength > SCRIPT_LIMITS.outputBytes)
    throw new Error('Script reference context is too large.')
  const normalized = parsePenDocument(serialized)
  const finalBudget = validateStructuredData(normalized.children[0].children, SCRIPT_LIMITS)
  validateStructuredData(normalized.children.slice(1), SCRIPT_LIMITS, finalBudget)
  return { penDocument: normalized, dependencyId, dependencies }
}
