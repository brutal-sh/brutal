import { isEqual } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { instanceMainComponent } from '@open-pencil/scene-graph/instances'
import { copiedComponentLayerId } from '@open-pencil/scene-graph/instances/overrides'

import { fieldsSetBy } from '../nodes'
import type { PenNode, PenOverride } from '../schema'
import type { PenExportDiagnostic } from './diagnostics'

export type WriteProperties = (
  node: SceneNode,
  path: string,
  topLevel: boolean,
  copy: boolean
) => PenNode
const IDENTITY = new Set(['id', 'type', 'reusable', 'children', 'descendants'])
const PLACEMENT = new Set(['x', 'y', 'rotation', 'flipX', 'flipY'])

function nativeFields(key: string, value: unknown): string[] {
  const fields = fieldsSetBy({ [key]: value })
  if (key === 'width' || key === 'height')
    fields.push('primaryAxisSizing', 'counterAxisSizing', 'layoutGrow', 'layoutAlignSelf')
  return fields
}

/** Preserve explicitly claimed equal values as well as differences, so component edits still propagate. */
function delta(
  target: PenNode,
  source: PenNode,
  claims: ReadonlyMap<string, unknown>,
  root: boolean
): PenOverride {
  const result: PenOverride = {}
  for (const [key, value] of Object.entries(target)) {
    if (IDENTITY.has(key)) continue
    const claimed = nativeFields(key, value).some(
      (field) =>
        claims.has(field) ||
        [...claims.keys()].some((claim) => claim.startsWith(`boundVariables/${field}`))
    )
    if ((root && PLACEMENT.has(key)) || claimed || !isEqual(value, source[key])) result[key] = value
  }
  return result
}

/** Linked refs retain explicit overrides through nested component instances. */
export function writeInstance(
  graph: SceneGraph,
  instance: SceneNode,
  path: string,
  topLevel: boolean,
  properties: WriteProperties,
  diagnostics: PenExportDiagnostic[]
): PenNode {
  const add = (node: SceneNode, suffix: string, message: string) =>
    diagnostics.push({ nodeId: node.id, path: `${path}/${suffix}`, message })
  const component = instanceMainComponent(graph, instance)
  if (!component) {
    add(instance, 'ref', 'The instance has no available main component.')
    return { id: instance.id, type: 'ref', ref: '' }
  }
  const target = properties(instance, path, topLevel, true)
  const source = properties(component, `${path}/component`, false, false)
  const own = delta(target, source, instance.instanceOverrides.self, true)
  const descendants: Record<string, PenOverride> = {}

  function inspectClaims(
    node: SceneNode,
    values: PenNode,
    claims: ReadonlyMap<string, unknown>,
    at: string
  ) {
    const mapped = new Set(
      Object.entries(values).flatMap(([key, value]) => nativeFields(key, value))
    )
    for (const field of claims.keys()) {
      if (field === 'sourceComponentId' || field.startsWith('boundVariables/')) continue
      if (!mapped.has(field))
        add(node, at, `Instance override ${field} cannot be preserved by this writer.`)
    }
  }
  inspectClaims(instance, target, instance.instanceOverrides.self, 'overrides')
  inspectClearedProperties(instance, target, source, 'overrides')

  function inspectClearedProperties(node: SceneNode, target: PenNode, source: PenNode, at: string) {
    for (const key of ['lineHeight', 'startAngle', 'sweepAngle', 'innerRadius']) {
      if (source[key] !== undefined && target[key] === undefined)
        add(node, at, `Clearing inherited ${key} is not supported by .pen export.`)
    }
  }

  function claimsFor(
    owner: SceneNode,
    sourceOwner: SceneNode | undefined,
    copy: SceneNode,
    original: SceneNode
  ) {
    const inherited = sourceOwner?.instanceOverrides.descendants.get(original.id)
    const claims = new Map(
      [...(owner.instanceOverrides.descendants.get(copy.id) ?? [])].filter(
        ([field]) => !inherited?.has(field)
      )
    )
    if (copy.type === 'INSTANCE') {
      for (const [field, value] of copy.instanceOverrides.self) {
        if (!original.instanceOverrides.self.has(field)) claims.set(field, value)
      }
    }
    return claims
  }

  function children(
    from: SceneNode,
    to: SceneNode,
    definition: SceneNode,
    owner: SceneNode,
    sourceOwner?: SceneNode,
    prefix = ''
  ) {
    const originals = graph.getChildren(from.id)
    const copies = graph.getChildren(to.id)
    const definitions = graph.getChildren(definition.id)
    if (originals.length !== copies.length || originals.length !== definitions.length) {
      add(to, 'children', 'Instance child replacements and structural changes are not supported.')
      return
    }
    for (const [index, original] of originals.entries()) {
      const copy = copies[index]
      const defined = definitions[index]
      const sourceId = copiedComponentLayerId(owner.instanceOverrides, owner.id, copy)
      if (sourceId !== original.id || copy.type !== original.type) {
        add(
          copy,
          'children',
          'Instance reordering, replacement or component swaps are not supported.'
        )
        continue
      }
      const key = `${prefix}${defined.id}`
      const at = `${path}/descendants/${key}`
      const authored = properties(copy, at, false, true)
      const inherited = properties(original, `${at}/component`, false, true)
      inspectClearedProperties(copy, authored, inherited, `descendants/${key}`)
      const claims = claimsFor(owner, sourceOwner, copy, original)
      inspectClaims(copy, authored, claims, `descendants/${key}`)
      const override = delta(authored, inherited, claims, false)
      if (Object.keys(override).length) descendants[key] = override
      if (copy.type === 'INSTANCE') {
        const main = instanceMainComponent(graph, original)
        if (!main || instanceMainComponent(graph, copy)?.id !== main.id) {
          add(
            copy,
            `descendants/${key}`,
            'Nested component swaps are not yet supported by .pen export.'
          )
          continue
        }
        children(original, copy, main, copy, original, `${key}/`)
      } else children(original, copy, defined, owner, sourceOwner, prefix)
    }
  }
  children(component, instance, component, instance)
  return {
    ...own,
    id: instance.id,
    type: 'ref',
    ref: component.id,
    ...(Object.keys(descendants).length ? { descendants } : {})
  }
}
