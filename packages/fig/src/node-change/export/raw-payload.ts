import { effectiveFigmaRawNodeFields, effectiveFigmaSourcePayload } from '#fig/source-metadata'

import type { SceneNode } from '@open-pencil/scene-graph'
import type { GUID } from '@open-pencil/scene-graph/primitives'

import { bytesToHex } from '../bytes'
import { applyColorVariableBinding } from './context'
import type { KiwiNodeChange, SceneNodeToKiwiContext } from './context'

const FIGMA_PAYLOAD_VARIABLE_MAP_FIELDS = new Set([
  'variableConsumptionMap',
  'parameterConsumptionMap'
])
const FIGMA_PAYLOAD_PAINT_VARIABLE_FIELDS = new Set(['colorVar', 'opacityVar'])

const SUPPORTED_VARIABLE_DATA_TYPES = new Set([
  'BOOLEAN',
  'FLOAT',
  'STRING',
  'ALIAS',
  'COLOR',
  'SYMBOL_ID',
  'TEXT_DATA',
  'PROP_REF'
])

interface FigmaPayloadVariableMap {
  entries?: unknown[]
}

interface FigmaPayloadVariableMapEntry {
  variableData?: { dataType?: string; value?: { propRefValue?: unknown } }
}

interface ColorVarCarrier {
  colorVar?: {
    value?: {
      alias?: {
        guid?: GUID
        assetRef?: { key: string; version?: string }
      }
    }
  }
}

function isFigmaPayloadVariableMap(value: unknown): value is FigmaPayloadVariableMap {
  return !!value && typeof value === 'object' && !Array.isArray(value) && 'entries' in value
}

function isFigmaPayloadVariableMapEntry(value: unknown): value is FigmaPayloadVariableMapEntry {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isSupportedVariableMapEntry(value: unknown): boolean {
  if (!isFigmaPayloadVariableMapEntry(value)) return false
  const entry = value
  const dataType = entry.variableData?.dataType
  return (
    (typeof dataType === 'string' && SUPPORTED_VARIABLE_DATA_TYPES.has(dataType)) ||
    !!entry.variableData?.value?.propRefValue
  )
}

function isPropRefVariableMapEntry(value: unknown): boolean {
  if (!isFigmaPayloadVariableMapEntry(value)) return false
  const entry = value
  return entry.variableData?.dataType === 'PROP_REF' || !!entry.variableData?.value?.propRefValue
}

function materializeSafeVariableMap(
  value: unknown,
  blobs: Uint8Array[],
  options: MaterializeFigmaPayloadOptions,
  predicate: (value: unknown) => boolean
): unknown {
  if (!isFigmaPayloadVariableMap(value)) return undefined
  const entries = value.entries?.filter(predicate) ?? []
  if (entries.length === 0) return undefined
  return { entries: entries.map((entry) => materializeFigmaPayload(entry, blobs, options)) }
}

interface MaterializeFigmaPayloadOptions {
  blobIndexByHex?: Map<string, number>
  includePaintVariables?: boolean
  includeVariableMaps?: boolean
}

function materializeFigmaBlob(
  value: { __openPencilFigmaBlob?: Uint8Array | Record<string, number> },
  blobs: Uint8Array[],
  options: MaterializeFigmaPayloadOptions
): number {
  const blob = value.__openPencilFigmaBlob
  const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(Object.values(blob ?? {}))
  const key = bytesToHex(bytes)
  const existing = options.blobIndexByHex?.get(key)
  if (existing !== undefined) return existing
  const index = blobs.length
  blobs.push(bytes)
  options.blobIndexByHex?.set(key, index)
  return index
}

function normalizeFigmaPayloadValue(key: string, value: unknown): unknown {
  if (key === 'stackCounterAlignItems' && value === 'STRETCH') return 'MIN'
  if (
    (key === 'stackJustify' ||
      key === 'stackPrimaryAlignItems' ||
      key === 'stackCounterAlign' ||
      key === 'stackCounterAlignItems') &&
    value === 'SPACE_EVENLY'
  ) {
    return 'SPACE_BETWEEN'
  }
  return value
}

export function materializeFigmaPayload(
  value: unknown,
  blobs: Uint8Array[],
  options: MaterializeFigmaPayloadOptions = {}
): unknown {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value))
    return value.map((item) => materializeFigmaPayload(item, blobs, options))
  if (!value || typeof value !== 'object') return value
  if ('__openPencilFigmaBlob' in value) {
    return materializeFigmaBlob(
      value as { __openPencilFigmaBlob?: Uint8Array | Record<string, number> },
      blobs,
      options
    )
  }

  const materialized: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (FIGMA_PAYLOAD_PAINT_VARIABLE_FIELDS.has(key) && !options.includePaintVariables) continue
    if (FIGMA_PAYLOAD_VARIABLE_MAP_FIELDS.has(key)) {
      const variableMap = materializeSafeVariableMap(
        child,
        blobs,
        options,
        options.includeVariableMaps ? isSupportedVariableMapEntry : isPropRefVariableMapEntry
      )
      if (variableMap !== undefined) materialized[key] = variableMap
      continue
    }
    materialized[key] = normalizeFigmaPayloadValue(
      key,
      materializeFigmaPayload(child, blobs, options)
    )
  }
  return materialized
}

/**
 * Fields that are ALWAYS set by explicit serialization and must NOT be
 * overwritten by rawNodeFields (which may contain stale Figma defaults).
 * rawNodeFields is a fallback for fields NOT covered by the explicit path.
 *
 * Additionally, applyRawFigmaNodeFields skips any key already present on `nc`,
 * so conditionally-set fields (fontVariations, derivedTextData, strokeJoin,
 * strokeWeight, miterLimit, etc.) are automatically protected when set.
 *
 * NOTE: fillGeometry, strokeGeometry, and vectorData are deliberately NOT
 * listed here. When nodeForGeometryExport suppresses explicit serialization
 * (because raw geometry exists), rawNodeFields must supply these fields.
 */
const RAW_FIELDS_OVERRIDE_BLOCKLIST = new Set([
  // Fields that are structurally dangerous if overwritten by stale raw data:
  'pageType',
  'derivedSymbolData',
  'derivedSymbolDataLayoutVersion',
  'sourceLibraryKey',
  'minSize',
  'maxSize',
  // Variable consumption maps: explicit serialization always sets these when
  // bindings exist, and our VARIABLE_BINDING_FIELDS mapping may produce different
  // kiwi field names than the original raw data for library variable references.
  'variableConsumptionMap',
  'parameterConsumptionMap'
])

/**
 * Resize reflowed this path-text node (glyphs regenerated, strokeGeometry
 * cleared). The raw strokeGeometry silhouettes are still at the pre-resize
 * size, so exporting them would paint stale full-size outlines.
 */
function isReflowedStrokedPathText(node: SceneNode): boolean {
  if (node.type !== 'TEXT' || node.textPathData === null) return false
  if ((node.derivedTextGlyphs?.length ?? 0) === 0 || node.textPathBox === null) return false
  if (node.strokeGeometry.length !== 0) return false
  // Only when the node has stroke paint but its baked silhouettes were
  // cleared by reflow (see resize.ts). Fill-only path text (no stroke paint,
  // so strokeGeometry is always empty) is untouched and keeps its raw
  // derivedTextData verbatim.
  //
  // This must key off live node.strokes, not rawNodeFields.strokeGeometry:
  // clearResizedRawGeometry (resize.ts) deletes that raw field on every
  // resize commit, so it's already gone by the time a reflowed node reaches
  // export and can never be used to detect reflow here.
  return node.strokes.length > 0
}

/**
 * An imported path-text node that was edited after import — moving/rotating
 * clears rawTransform (see clearEditedSourceMetadata), so the transform + size
 * are recomputed from the node's post-expand box (exportNodeTransform /
 * exportNodeSize). But the raw derivedTextData + baked silhouettes are still the
 * PRE-expand (un-shifted) payload — exporting them against the shifted box
 * re-triggers the import expand on reimport and drifts the node. Rebuild
 * derivedTextData from the live (shifted) glyphs and re-derive silhouettes,
 * exactly like the reflow path. rawTransform === null is the "edited" signal;
 * pristine nodes keep rawTransform and their raw payload verbatim.
 */
function isEditedPathText(node: SceneNode): boolean {
  return (
    node.type === 'TEXT' &&
    node.textPathData !== null &&
    // "Edited" = the raw transform no longer backs the node. Editing does not
    // clear source.fig.rawTransform directly; effectiveFigmaSourcePayload
    // derives it from source.editedFields, so ask that, not the raw field.
    effectiveFigmaSourcePayload(node).rawTransform === null &&
    (node.derivedTextGlyphs?.length ?? 0) > 0
  )
}

export function applyRawFigmaNodeFields(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  let rawFields = effectiveFigmaRawNodeFields(node)
  if (isReflowedStrokedPathText(node) || isEditedPathText(node)) {
    // Strip before materializing so the stale blobs never enter the file:
    // silhouettes are re-derived from glyphs by Figma/reimport, and
    // derivedTextData was rebuilt from the reflowed glyphs by
    // serializeTextProps (raw would clobber the new positions).
    rawFields = { ...rawFields }
    delete rawFields.strokeGeometry
    delete rawFields.derivedTextData
  }
  const materialized = materializeFigmaPayload(rawFields, context.blobs, {
    blobIndexByHex: context.blobIndexByHex,
    includePaintVariables: true,
    includeVariableMaps: true
  }) as Partial<KiwiNodeChange>
  for (const key of Object.keys(materialized) as (keyof KiwiNodeChange)[]) {
    if (RAW_FIELDS_OVERRIDE_BLOCKLIST.has(String(key))) continue
    // For paint arrays on imported nodes, the raw NC data preserves the
    // original opacity/color.a split (e.g. opacity=0 for invisible strokes).
    // The scene model may lose this distinction for instance children whose
    // strokes are resolved from component overrides. Prefer the raw data,
    // except for a bound color: Figma draws the color a paint saves, so it
    // takes what its variable resolves to now.
    if ((key === 'fillPaints' || key === 'strokePaints') && node.source.id) {
      const paints = materialized[key]
      const current = key === 'fillPaints' ? node.fills : node.strokes
      nc[key] = paints?.map((paint, index) => {
        const field = `${key === 'fillPaints' ? 'fills' : 'strokes'}/${index}/color`
        const bound = applyColorVariableBinding(context, node, paint, field)
        const resolved = node.boundVariables[field] ? current[index] : undefined
        return resolved
          ? { ...bound, color: context.safeColor(resolved.color), opacity: resolved.opacity }
          : bound
      })
      continue
    }
    if (
      key === 'effects' &&
      node.source.id &&
      context.assetRefToVarGuid &&
      context.assetRefToVarGuid.size > 0
    ) {
      nc[key] = convertColorVarAssetRefs(materialized[key], context.assetRefToVarGuid)
      continue
    }
    if (key === 'derivedTextData' && node.source.id) {
      nc.derivedTextData = materialized.derivedTextData
      continue
    }
    if (key === 'textDecorationFillPaints' && node.source.id) {
      nc.textDecorationFillPaints = materialized.textDecorationFillPaints
      continue
    }
    // Skip any key already set on nc — explicit serialization takes priority
    if (key in nc) continue
    nc[key] = materialized[key]
  }
}

/** Convert asset refs only for payloads whose Kiwi schema rejects asset-ref aliases. */
function convertColorVarAssetRefs<T>(values: T, assetRefToVarGuid: Map<string, GUID>): T {
  if (!Array.isArray(values)) return values
  const converted = values.map((value: ColorVarCarrier) => {
    const colorVar = value.colorVar
    const alias = colorVar?.value?.alias
    if (!colorVar || !alias || alias.guid || !alias.assetRef?.key) return value
    const assetRef = alias.assetRef
    const lookupKey = assetRef.version ? `${assetRef.key}@${assetRef.version}` : assetRef.key
    const guid = assetRefToVarGuid.get(lookupKey) ?? assetRefToVarGuid.get(assetRef.key)
    if (!guid) return value
    return {
      ...value,
      colorVar: {
        ...colorVar,
        value: { ...colorVar.value, alias: { guid } }
      }
    }
  })
  return converted.some((value, index) => value !== values[index]) ? (converted as T) : values
}
