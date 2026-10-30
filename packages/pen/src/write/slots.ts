import type { ComponentPropertyDefinition, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { instanceMainComponent } from '@open-pencil/scene-graph/instances'
import { copiedComponentLayerId } from '@open-pencil/scene-graph/instances/overrides'
import { slotOwner, slotPropertyId, slotScope } from '@open-pencil/scene-graph/slots'

import type { PenExportDiagnostic } from './diagnostics'

/** Only these mapped slot fields bypass the generic non-default-content refusal. */
export function createSlotWriter(graph: SceneGraph, diagnostics: PenExportDiagnostic[]) {
  const handled = new Map<string, Set<keyof SceneNode>>()
  const suggestions = new Map<string, string[]>()
  const allow = (node: SceneNode, field: keyof SceneNode) => {
    const fields = handled.get(node.id) ?? new Set<keyof SceneNode>()
    fields.add(field)
    handled.set(node.id, fields)
  }
  const add = (node: SceneNode, field: string, message: string) =>
    diagnostics.push({ nodeId: node.id, path: `/nodes/${node.id}/${field}`, message })
  const bindings = new Map<string, Map<string, SceneNode[]>>()
  for (const frame of graph.nodes.values()) {
    const propertyId = slotPropertyId(frame)
    const owner = propertyId && slotOwner(graph, frame)
    if (!propertyId || !owner) continue
    const properties = bindings.get(owner.id) ?? new Map<string, SceneNode[]>()
    properties.set(propertyId, [...(properties.get(propertyId) ?? []), frame])
    bindings.set(owner.id, properties)
  }
  const framesFor = (owner: SceneNode, propertyId: string) =>
    bindings.get(owner.id)?.get(propertyId) ?? []

  function copiesFrame(node: SceneNode, owner: SceneNode, sourceId: string): boolean {
    let id = copiedComponentLayerId(owner.instanceOverrides, owner.id, node)
    const visited = new Set<string>()
    while (id && !visited.has(id)) {
      if (id === sourceId) return true
      visited.add(id)
      id = graph.getNode(id)?.componentId ?? undefined
    }
    return false
  }

  function inspectDefinition(
    owner: SceneNode,
    definition: ComponentPropertyDefinition,
    index: number
  ) {
    const frames = framesFor(owner, definition.id)
    if (frames.length !== 1 || frames[0].type !== 'FRAME' || frames[0].childIds.length) {
      add(
        owner,
        'componentPropertyDefinitions',
        'Each .pen slot needs one empty frame in its main component.'
      )
      return
    }
    const frame = frames[0]
    const taken = new Set(
      owner.componentPropertyDefinitions.slice(0, index).map((item) => item.name)
    )
    const base = frame.name.trim() || 'Slot'
    let name = base
    for (let suffix = 2; taken.has(name); suffix++) name = `${base} ${suffix}`
    if (
      definition.name !== name ||
      definition.defaultValue !== '' ||
      definition.description ||
      definition.variantOptions?.length
    )
      add(
        owner,
        'componentPropertyDefinitions',
        'Custom slot property names, descriptions and defaults have no .pen equivalent.'
      )
    const settings = definition.slotSettings
    if (
      settings &&
      (settings.minChildren !== undefined ||
        settings.maxChildren !== undefined ||
        settings.allowPreferredValuesOnly ||
        settings.displayEmptyByDefault ||
        settings.stretchChildOnInsert)
    )
      add(
        owner,
        'componentPropertyDefinitions',
        'Slot limits and insertion behavior cannot be represented by .pen suggestions.'
      )
    const preferred = definition.preferredValues ?? []
    if (preferred.some((id) => graph.getNode(id)?.type !== 'COMPONENT'))
      add(
        owner,
        'componentPropertyDefinitions',
        'Slot suggestions must name components in this document by ID.'
      )
    suggestions.set(frame.id, [...preferred])
  }

  function inspectDefinitions(node: SceneNode) {
    const definitions = node.componentPropertyDefinitions
    if (
      node.type === 'COMPONENT' &&
      definitions.length &&
      definitions.every((item) => item.type === 'SLOT')
    ) {
      allow(node, 'componentPropertyDefinitions')
      const ids = definitions.map((item) => item.id)
      if (new Set(ids).size !== ids.length)
        add(node, 'componentPropertyDefinitions', 'Duplicate slot property IDs are not supported.')
      definitions.forEach((definition, index) => inspectDefinition(node, definition, index))
    }
  }
  function inspectReferences(node: SceneNode) {
    const references = node.componentPropertyReferences
    if (references.length === 1 && references[0].field === 'SLOT_CONTENT') {
      const scope = slotScope(graph, node.id)
      const owner =
        scope.kind === 'slot'
          ? instanceMainComponent(graph, scope.instance)
          : slotOwner(graph, node)
      const definition = owner?.componentPropertyDefinitions.find(
        (item) => item.id === references[0].propertyId && item.type === 'SLOT'
      )
      const source = owner && framesFor(owner, references[0].propertyId)
      if (
        node.type === 'FRAME' &&
        definition &&
        source?.length === 1 &&
        (scope.kind !== 'slot' || copiesFrame(node, scope.instance, source[0].id))
      )
        allow(node, 'componentPropertyReferences')
    }
  }
  function inspectAssignments(node: SceneNode) {
    const assignments = Object.entries(node.componentPropertyAssignments)
    if (node.type === 'INSTANCE' && assignments.length) {
      const component = instanceMainComponent(graph, node)
      if (
        component &&
        assignments.every(
          ([id, value]) =>
            value === '' &&
            component.componentPropertyDefinitions.some(
              (definition) => definition.id === id && definition.type === 'SLOT'
            ) &&
            framesFor(component, id).length === 1
        )
      )
        allow(node, 'componentPropertyAssignments')
    }
  }
  for (const node of graph.nodes.values()) {
    inspectDefinitions(node)
    inspectReferences(node)
    inspectAssignments(node)
  }

  return {
    handled: (node: SceneNode) => handled.get(node.id),
    suggestions: (node: SceneNode) => suggestions.get(node.id)
  }
}
