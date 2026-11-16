import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { guidToString, isUnsetGuid } from '@open-pencil/kiwi/fig/guid'
import type {
  SceneNode,
  NodeType,
  ComponentPropertyDefinition,
  ComponentPropertyReference,
  ComponentPropertyType,
  SlotSettings,
  SymbolLink,
  VariantPropSpec
} from '@open-pencil/scene-graph'
import type { GUID } from '@open-pencil/scene-graph/primitives'
import { parseVariantName } from '@open-pencil/scene-graph/variant-name'

const COMPONENT_PROP_TYPE_MAP: Record<string, ComponentPropertyType> = {
  VARIANT: 'VARIANT',
  TEXT: 'TEXT',
  BOOL: 'BOOLEAN',
  BOOLEAN: 'BOOLEAN',
  INSTANCE_SWAP: 'INSTANCE_SWAP',
  SLOT: 'SLOT'
}

function componentPropValueToString(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const propValue = value as {
    boolValue?: boolean
    textValue?: string | { characters?: string }
    guidValue?: GUID
  }
  if (typeof propValue.boolValue === 'boolean') return String(propValue.boolValue)
  if (typeof propValue.textValue === 'string') return propValue.textValue
  if (propValue.textValue && typeof propValue.textValue === 'object') {
    return propValue.textValue.characters ?? ''
  }
  return propValue.guidValue ? guidToString(propValue.guidValue) : ''
}

interface RawComponentPropDef {
  id?: GUID
  name?: string
  type?: string
  initialValue?: unknown
  description?: string
  preferredValues?: {
    stringValues?: string[]
    instanceSwapValues?: Array<{ key?: string }>
  }
  slotPropConfig?: {
    stretchChildOnInsert?: boolean
    displayByDefault?: boolean
    minChildren?: number
    maxChildren?: number
    allowPreferredValuesOnly?: boolean
  }
}

function slotSettings(config: NonNullable<RawComponentPropDef['slotPropConfig']>): SlotSettings {
  const settings: SlotSettings = {
    allowPreferredValuesOnly: config.allowPreferredValuesOnly ?? false,
    displayEmptyByDefault: config.displayByDefault ?? false,
    stretchChildOnInsert: config.stretchChildOnInsert ?? false
  }
  if (config.minChildren !== undefined) settings.minChildren = config.minChildren
  if (config.maxChildren !== undefined) settings.maxChildren = config.maxChildren
  return settings
}

interface RawComponentPropRef {
  defID?: GUID
  componentPropNodeField?: string | number
  isDeleted?: boolean
}

interface RawComponentPropValue {
  boolValue?: boolean
  textValue?: string | { characters?: string }
  guidValue?: GUID
}

interface RawComponentPropAssignment {
  defID?: GUID
  value?: RawComponentPropValue
  varValue?: {
    value?: {
      boolValue?: boolean
      textValue?: string
      textDataValue?: { characters?: string }
      symbolIdValue?: { guid?: GUID }
    }
  }
}

function extractComponentPropertyDefs(nc: NodeChange): ComponentPropertyDefinition[] {
  const defs = nc.componentPropDefs as RawComponentPropDef[] | undefined
  if (!defs?.length) return []
  const result: ComponentPropertyDefinition[] = []
  for (const def of defs) {
    if (!def.id || !def.name) continue
    result.push(componentPropertyDefinition(def, def.id, def.name))
  }
  return result
}

function preferredComponentValues(def: RawComponentPropDef, type: ComponentPropertyType) {
  return type === 'INSTANCE_SWAP' || type === 'SLOT'
    ? def.preferredValues?.instanceSwapValues
        ?.map((value) => value.key)
        .filter((value): value is string => value !== undefined)
    : undefined
}

function componentPropertyDefinition(
  def: RawComponentPropDef,
  id: GUID,
  name: string
): ComponentPropertyDefinition {
  const propType = COMPONENT_PROP_TYPE_MAP[def.type ?? ''] ?? 'VARIANT'
  const definition: ComponentPropertyDefinition = {
    id: guidToString(id),
    name,
    type: propType,
    defaultValue: componentPropValueToString(def.initialValue),
    variantOptions: propType === 'VARIANT' ? def.preferredValues?.stringValues : undefined,
    preferredValues: preferredComponentValues(def, propType)
  }
  if (def.description) definition.description = def.description
  if (propType === 'SLOT' && def.slotPropConfig)
    definition.slotSettings = slotSettings(def.slotPropConfig)
  return definition
}

function extractComponentPropertyRefs(nc: NodeChange): ComponentPropertyReference[] {
  const refs = nc.componentPropRefs as RawComponentPropRef[] | undefined
  if (!refs?.length) return []
  const fieldMap: Record<string, ComponentPropertyReference['field'] | undefined> = {
    '0': 'VISIBLE',
    '1': 'TEXT',
    '2': 'INSTANCE_SWAP',
    '4': 'SLOT_CONTENT',
    VISIBLE: 'VISIBLE',
    TEXT_DATA: 'TEXT',
    OVERRIDDEN_SYMBOL_ID: 'INSTANCE_SWAP',
    SLOT_CONTENT_ID: 'SLOT_CONTENT'
  }
  return refs.flatMap((ref) => {
    const field = fieldMap[String(ref.componentPropNodeField)]
    return ref.defID && field && !ref.isDeleted
      ? [{ propertyId: guidToString(ref.defID), field }]
      : []
  })
}

function hasComponentPropertyValue(value: RawComponentPropAssignment['value']): boolean {
  return (
    !!value &&
    (value.boolValue !== undefined ||
      value.textValue !== undefined ||
      value.guidValue !== undefined)
  )
}

function variableComponentPropertyValue(
  variableValue: NonNullable<RawComponentPropAssignment['varValue']>['value']
): string {
  if (!variableValue) return ''
  if (variableValue.symbolIdValue?.guid) return guidToString(variableValue.symbolIdValue.guid)
  if (variableValue.boolValue !== undefined) return String(variableValue.boolValue)
  if (variableValue.textValue !== undefined) return variableValue.textValue
  return variableValue.textDataValue?.characters ?? ''
}

function componentPropertyAssignmentValue(assignment: RawComponentPropAssignment): string {
  if (hasComponentPropertyValue(assignment.value))
    return componentPropValueToString(assignment.value)
  return variableComponentPropertyValue(assignment.varValue?.value)
}

function extractComponentPropertyAssignments(nc: NodeChange): Record<string, string> {
  const assignments = nc.componentPropAssignments as RawComponentPropAssignment[] | undefined
  if (!assignments?.length) return {}
  return Object.fromEntries(
    assignments.flatMap((assignment) =>
      assignment.defID
        ? [[guidToString(assignment.defID), componentPropertyAssignmentValue(assignment)]]
        : []
    )
  )
}

function extractVariantPropSpecs(nc: NodeChange): VariantPropSpec[] {
  const specs = nc.variantPropSpecs as Array<{ propDefId?: GUID; value?: string }> | undefined
  if (!specs?.length) return []
  return specs
    .filter((spec): spec is { propDefId: GUID; value?: string } => !!spec.propDefId)
    .map((spec) => ({
      propDefId: guidToString(spec.propDefId),
      value: spec.value ?? ''
    }))
}

function extractComponentPropertyValues(nc: NodeChange): Record<string, string> {
  const specs = extractVariantPropSpecs(nc)
  const defs = new Map(extractComponentPropertyDefs(nc).map((def) => [def.id, def.name]))
  if (specs.length > 0 && defs.size > 0) {
    const values: Record<string, string> = {}
    for (const spec of specs) values[defs.get(spec.propDefId) ?? spec.propDefId] = spec.value
    return values
  }

  const name = nc.name
  if (!name?.includes('=')) return {}
  return parseVariantName(name)
}

type ComponentMetadataProps = Pick<
  SceneNode,
  | 'componentKey'
  | 'sourceLibraryKey'
  | 'publishId'
  | 'overrideKey'
  | 'sharedSymbolVersion'
  | 'publishedVersion'
  | 'isPublishable'
  | 'isSymbolPublishable'
  | 'isExposedInstance'
  | 'symbolDescription'
  | 'symbolLinks'
  | 'variantPropSpecs'
>

/** Null for a missing GUID and for the unset GUID, which many layers share and names none. */
function guidToStringOrNull(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const guid = value as Partial<GUID>
  if (typeof guid.sessionID !== 'number' || typeof guid.localID !== 'number') return null
  const parsed = { sessionID: guid.sessionID, localID: guid.localID }
  return isUnsetGuid(parsed) ? null : guidToString(parsed)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function booleanOrFalse(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function extractComponentMetadata(nc: NodeChange): ComponentMetadataProps {
  const symbolLinks = (nc.symbolLinks as Array<Partial<SymbolLink>> | undefined) ?? []
  return {
    componentKey: stringOrNull(nc.componentKey),
    sourceLibraryKey: stringOrNull(nc.sourceLibraryKey),
    publishId: guidToStringOrNull(nc.publishID),
    overrideKey: guidToStringOrNull(nc.overrideKey),
    sharedSymbolVersion: stringOrNull(nc.sharedSymbolVersion),
    publishedVersion: stringOrNull(nc.publishedVersion),
    isPublishable: booleanOrFalse(nc.isPublishable),
    isSymbolPublishable: booleanOrFalse(nc.isSymbolPublishable),
    isExposedInstance: booleanOrFalse(nc.propsAreBubbled),
    symbolDescription: stringOrEmpty(nc.symbolDescription),
    symbolLinks: symbolLinks
      .filter((link): link is SymbolLink => typeof link.uri === 'string')
      .map((link) => ({
        uri: link.uri,
        displayName: link.displayName,
        displayText: link.displayText
      })),
    variantPropSpecs: extractVariantPropSpecs(nc)
  }
}
function extractSymbolId(nc: NodeChange): string {
  const sd = nc.symbolData as { symbolID?: GUID } | undefined
  if (!sd?.symbolID) return ''
  return guidToString(sd.symbolID)
}

export function convertComponentProps(
  nc: NodeChange,
  nodeType: NodeType | 'DOCUMENT' | 'VARIABLE'
) {
  return {
    componentId: extractSymbolId(nc),
    componentPropertyDefinitions: nodeType === 'INSTANCE' ? [] : extractComponentPropertyDefs(nc),
    componentPropertyReferences: extractComponentPropertyRefs(nc),
    componentPropertyAssignments: extractComponentPropertyAssignments(nc),
    componentPropertyValues: extractComponentPropertyValues(nc),
    ...extractComponentMetadata(nc)
  }
}
