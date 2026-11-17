import { effectiveFigmaRawNodeFields } from '#fig/source-metadata'
import { compact } from 'es-toolkit/array'

import type {
  ComponentPropertyDefinition,
  ComponentPropertyReferenceField,
  SceneGraph,
  SceneNode
} from '@open-pencil/scene-graph'
import type { GUID } from '@open-pencil/scene-graph/primitives'

import {
  componentPropAssignment,
  componentPropertyValue,
  componentPropertyVariableValue
} from './assignments/values'
import {
  getOrCreatePropertyGuid,
  parseGuidOrNull,
  type KiwiNodeChange,
  type SceneNodeToKiwiContext
} from './context'
import { slotDefinitionFields } from './slots'

interface ExportedPropertyReference {
  defID: GUID
  componentPropNodeField: string
}
interface ExportedParameterEntry {
  variableField?: string
  variableData?: {
    value: { propRefValue: { defId: GUID } }
    dataType: string
    resolvedDataType: string
  }
}

function componentPropertyTypeForKiwi(type: string) {
  if (type === 'BOOLEAN') return 'BOOL'
  return type
}

function componentPropertyPreferredValues(
  definition: ComponentPropertyDefinition,
  context: SceneNodeToKiwiContext
) {
  if (
    (definition.type === 'INSTANCE_SWAP' || definition.type === 'SLOT') &&
    definition.preferredValues?.length
  ) {
    return {
      instanceSwapValues: definition.preferredValues.map((value) => {
        const target = context.graph.getNode(value)
        const key = target?.componentKey || target?.sourceLibraryKey || value
        return { type: 'COMPONENT', key }
      })
    }
  }
  if (definition.type === 'VARIANT' && definition.variantOptions?.length) {
    return { stringValues: [...definition.variantOptions] }
  }
  return undefined
}

function componentPropertyNodeField(field: ComponentPropertyReferenceField): string {
  if (field === 'TEXT') return 'TEXT_DATA'
  if (field === 'INSTANCE_SWAP') return 'OVERRIDDEN_SYMBOL_ID'
  if (field === 'SLOT_CONTENT') return 'SLOT_CONTENT_ID'
  return 'VISIBLE'
}

export function buildComponentPropIndex(
  graph: SceneGraph
): ReadonlyMap<string, ComponentPropertyDefinition> {
  const definitions = new Map<string, ComponentPropertyDefinition>()
  for (const candidate of graph.getAllNodes()) {
    for (const definition of candidate.componentPropertyDefinitions) {
      if (!definitions.has(definition.id)) definitions.set(definition.id, definition)
    }
  }
  return definitions
}

function shouldSerializeRawBackedField(
  node: SceneNode,
  rawField: string,
  hasValue: boolean,
  alreadySerialized = false
): boolean {
  return hasValue && !(rawField in effectiveFigmaRawNodeFields(node)) && !alreadySerialized
}

export function mergeParameterBindings(nc: KiwiNodeChange): void {
  const parameters = nc.parameterConsumptionMap
  const entries = parameters?.entries ?? []
  const fields = new Set(entries.map((entry) => entry.variableField))
  const variables = nc.variableConsumptionMap?.entries ?? []
  if (!variables.length) return
  nc.parameterConsumptionMap = {
    entries: [...variables.filter((entry) => !fields.has(entry.variableField)), ...entries]
  }
}

function applyParameterReferences(nc: KiwiNodeChange, refs: ExportedPropertyReference[]): void {
  if (!refs.length) return
  const existing = nc.parameterConsumptionMap as { entries?: ExportedParameterEntry[] } | undefined
  const fields = new Set(refs.map((ref) => ref.componentPropNodeField))
  const entries = (existing?.entries ?? []).filter(
    (entry) => !fields.has(entry.variableField ?? '')
  )
  const types: Record<string, string> = {
    VISIBLE: 'BOOLEAN',
    TEXT_DATA: 'STRING',
    OVERRIDDEN_SYMBOL_ID: 'SYMBOL_ID',
    SLOT_CONTENT_ID: 'SLOT_CONTENT_ID'
  }
  for (const ref of refs)
    entries.push({
      variableField: ref.componentPropNodeField,
      variableData: {
        value: { propRefValue: { defId: ref.defID } },
        dataType: 'PROP_REF',
        resolvedDataType: types[ref.componentPropNodeField]
      }
    })
  nc.parameterConsumptionMap = { entries }
}

function applyPublishedIdentity(node: SceneNode, nc: KiwiNodeChange): void {
  if (node.componentKey) nc.componentKey = node.componentKey
  if (node.sourceLibraryKey) nc.sourceLibraryKey = node.sourceLibraryKey
  const publishId = node.publishId ? parseGuidOrNull(node.publishId) : null
  const overrideKey = node.overrideKey ? parseGuidOrNull(node.overrideKey) : null
  if (publishId) nc.publishID = publishId
  if (overrideKey) nc.overrideKey = overrideKey
  if (node.sharedSymbolVersion) nc.sharedSymbolVersion = node.sharedSymbolVersion
  if (node.publishedVersion) nc.publishedVersion = node.publishedVersion
}

function applyComponentPresentation(node: SceneNode, nc: KiwiNodeChange): void {
  if (node.type === 'COMPONENT_SET' || node.isPublishable) nc.isPublishable = node.isPublishable
  if (node.type === 'COMPONENT' || node.isSymbolPublishable) {
    nc.isSymbolPublishable = node.isSymbolPublishable
  }
  if (node.isExposedInstance) nc.propsAreBubbled = true
  if (node.symbolDescription) nc.symbolDescription = node.symbolDescription
  if (node.symbolLinks.length > 0) nc.symbolLinks = structuredClone(node.symbolLinks)
}

function componentPropertyRecord(
  context: SceneNodeToKiwiContext,
  def: ComponentPropertyDefinition,
  localIdCounter: { value: number }
) {
  const record: Record<string, unknown> = {
    id: getOrCreatePropertyGuid(context, def.id, localIdCounter),
    name: def.name,
    type: componentPropertyTypeForKiwi(def.type),
    preferredValues: componentPropertyPreferredValues(def, context)
  }
  if (def.type === 'SLOT') Object.assign(record, slotDefinitionFields(def))
  else {
    record.initialValue = componentPropertyValue(
      def.type,
      def.defaultValue,
      context,
      localIdCounter
    )
    record.varValue = componentPropertyVariableValue(
      def.type,
      def.defaultValue,
      context,
      localIdCounter
    )
  }
  if (def.description) record.description = def.description
  return record
}

function applyDefinitions(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const componentPropDefs = node.componentPropertyDefinitions.map((def) =>
    componentPropertyRecord(context, def, localIdCounter)
  )
  if (shouldSerializeRawBackedField(node, 'componentPropDefs', componentPropDefs.length > 0)) {
    nc.componentPropDefs = componentPropDefs
  }
}

function applyPropertyReferences(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const parameterRefs = node.componentPropertyReferences.map((ref) => ({
    defID: getOrCreatePropertyGuid(context, ref.propertyId, localIdCounter),
    componentPropNodeField: componentPropertyNodeField(ref.field)
  }))
  // Figma binds a slot frame only through its parameter map, never a legacy property ref.
  const componentPropRefs = parameterRefs.filter(
    (ref) => ref.componentPropNodeField !== 'SLOT_CONTENT_ID'
  )
  if (shouldSerializeRawBackedField(node, 'componentPropRefs', componentPropRefs.length > 0)) {
    nc.componentPropRefs = componentPropRefs
  }

  applyParameterReferences(nc, parameterRefs)
}

function applyAssignments(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const componentPropAssignments = compact(
    Object.entries(node.componentPropertyAssignments).map(([propertyId, value]) =>
      componentPropAssignment(context, node, propertyId, value, localIdCounter)
    )
  )
  if (
    shouldSerializeRawBackedField(
      node,
      'componentPropAssignments',
      componentPropAssignments.length > 0,
      Boolean(nc.componentPropAssignments)
    )
  ) {
    nc.componentPropAssignments = componentPropAssignments
  }
}

function applyVariantSpecs(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const variantPropSpecs = node.variantPropSpecs.map((spec) => ({
    propDefId: getOrCreatePropertyGuid(context, spec.propDefId, localIdCounter),
    value: spec.value
  }))
  if (shouldSerializeRawBackedField(node, 'variantPropSpecs', variantPropSpecs.length > 0)) {
    nc.variantPropSpecs = variantPropSpecs
  }
}

export function applyComponentMetadata(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  applyPublishedIdentity(node, nc)
  applyComponentPresentation(node, nc)
  applyDefinitions(context, node, nc, localIdCounter)
  applyPropertyReferences(context, node, nc, localIdCounter)
  applyAssignments(context, node, nc, localIdCounter)
  applyVariantSpecs(context, node, nc, localIdCounter)
}
