import { omit, pick } from 'es-toolkit/object'
import * as v from 'valibot'

import type { NodeChange, PluginData, PluginRelaunchData } from '@open-pencil/kiwi/fig/codec'
import { guidToString } from '@open-pencil/kiwi/fig/guid'
import type {
  ExportSetting,
  Fill,
  PluginDataEntry,
  PluginRelaunchDataEntry,
  SceneGraph,
  SceneNode
} from '@open-pencil/scene-graph'
import type { ExportFormatId } from '@open-pencil/scene-graph/export-format'
import { clampExportScale } from '@open-pencil/scene-graph/export-scale'
import { computeImageHash } from '@open-pencil/scene-graph/images'
import { fillSchema, meshGradientSchema } from '@open-pencil/scene-graph/paints'
import {
  hasPluginData,
  readPluginData,
  OPEN_PENCIL_PLUGIN_DATA,
  OPEN_PENCIL_PLUGIN_ID,
  withPluginData,
  type PluginDataField
} from '@open-pencil/scene-graph/plugin-data'
import type { Rect } from '@open-pencil/scene-graph/primitives'
import {
  shaderOfPaint,
  shaderPresetKey,
  withShaderPaints,
  type ShaderPaint
} from '@open-pencil/scene-graph/shaders'
import { paintBindingTarget } from '@open-pencil/scene-graph/variables'

import { readEffectiveFigmaRawField } from '../source-metadata'
import {
  resolveVariableConsumptionEntry,
  variableConsumptionEntries,
  VARIABLE_BINDING_FIELDS_INVERSE,
  referencesVariable
} from './variable/bindings'

const { boundVariables, exportSettings, librarySource, textPathBox } = OPEN_PENCIL_PLUGIN_DATA

const NATIVE_EXPORT_FORMATS: Record<string, ExportFormatId> = {
  PNG: 'png',
  JPEG: 'jpg',
  SVG: 'svg',
  PDF: 'pdf'
}

/** An OpenPencil plugin-data value on a record read from a `.fig` file. */
export function readNodeChangePluginData<T>(
  nc: Pick<NodeChange, 'pluginData'>,
  field: PluginDataField<T>
): T | undefined {
  return field.decode(
    nc.pluginData?.find(
      (entry) => entry.pluginID === OPEN_PENCIL_PLUGIN_ID && entry.key === field.key
    )?.value
  )
}

export function applyExportSettingsPluginData(
  node: Pick<SceneNode, 'exportSettings' | 'pluginData' | 'source'>
): void {
  if (node.exportSettings.length === 0) return
  if (
    !hasPluginData(node.pluginData, exportSettings) &&
    Array.isArray(readEffectiveFigmaRawField(node, 'exportSettings'))
  ) {
    return
  }
  node.pluginData = withPluginData(node.pluginData, exportSettings, node.exportSettings)
}

/**
 * textPathBox is OpenPencil-only state (the node-local rect the TEXT_PATH
 * layout path maps onto, after import-time box expansion and resize scaling).
 * The Kiwi schema has no home for it, and reconstructing it from an expanded,
 * resized node is ambiguous — persist it as plugin data so save/reopen keeps
 * reflow anchored correctly. A node still saved in its Figma box gets none: the
 * reader rebuilds the box from that, and this one, in the expanded node's
 * coordinates, would shift the path off the lettering a second time.
 */
export function applyTextPathBoxPluginData(
  node: {
    textPathBox: Rect | null
    pluginData: PluginDataEntry[]
  },
  savedInFigmaBox: boolean
): void {
  if (!node.textPathBox) return
  node.pluginData = withPluginData(
    node.pluginData,
    textPathBox,
    savedInFigmaBox ? undefined : node.textPathBox
  )
}

export function extractTextPathBox(nc: NodeChange): Rect | null {
  return readNodeChangePluginData(nc, textPathBox) ?? null
}

export function extractBoundVariables(nc: NodeChange): Record<string, string> {
  let bindings = readNodeChangePluginData(nc, boundVariables) ?? {}
  // Each paint carries its colour's alias. An instance's copy pairs its component's plugin data
  // with paints an override set, so the plugin data can name a binding those paints dropped.
  const decidedByPaints = (field: string) => {
    const target = paintBindingTarget(field)
    if (target?.colorIndex !== undefined) return false
    const list = target?.list
    return list === 'fills'
      ? nc.fillPaints !== undefined
      : list === 'strokes' && nc.strokePaints !== undefined
  }
  bindings = Object.fromEntries(
    Object.entries(bindings).filter(([field]) => !decidedByPaints(field))
  )
  for (const entry of variableConsumptionEntries(nc)) {
    const binding = resolveVariableConsumptionEntry(entry)
    if (binding) bindings[binding.field] = binding.variableId
    else if (entry.variableField && !referencesVariable(entry.variableData?.dataType)) {
      const field = VARIABLE_BINDING_FIELDS_INVERSE[entry.variableField]
      if (field) bindings = omit(bindings, [field])
    }
  }
  nc.fillPaints?.forEach((paint, i) => {
    const variableGuid = paint.colorVar?.value?.alias?.guid
    if (variableGuid) bindings[`fills/${i}/color`] = guidToString(variableGuid)
  })
  nc.strokePaints?.forEach((paint, i) => {
    const variableGuid = paint.colorVar?.value?.alias?.guid
    if (variableGuid) bindings[`strokes/${i}/color`] = guidToString(variableGuid)
  })
  return bindings
}

function mapNativeImageType(imageType: unknown): ExportFormatId | null {
  if (typeof imageType === 'string') return NATIVE_EXPORT_FORMATS[imageType] ?? null
  if (imageType === 0) return 'png'
  if (imageType === 1) return 'jpg'
  if (imageType === 2) return 'svg'
  if (imageType === 3) return 'pdf'
  return null
}

function extractNativeConstraintScale(constraint: unknown): number {
  if (!constraint || typeof constraint !== 'object' || Array.isArray(constraint)) return 1
  const type = (constraint as { type?: unknown }).type
  if (type !== 'CONTENT_SCALE' && type !== 0) return 1
  const value = (constraint as { value?: unknown }).value
  // Clamp native CONTENT_SCALE too: malformed .fig data can carry huge multipliers.
  return typeof value === 'number' && Number.isFinite(value) ? clampExportScale(value) : 1
}

export function extractExportSettings(nc: NodeChange): ExportSetting[] {
  const pluginSettings = readNodeChangePluginData(nc, exportSettings)
  if (pluginSettings) return pluginSettings

  return (nc.exportSettings ?? []).flatMap((entry): ExportSetting[] => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const format = mapNativeImageType((entry as { imageType?: unknown }).imageType)
    if (!format) return []
    return [
      {
        scale: extractNativeConstraintScale((entry as { constraint?: unknown }).constraint),
        format
      }
    ]
  })
}

export function extractPluginData(nc: NodeChange): PluginDataEntry[] {
  return (nc.pluginData ?? []).map((entry) => ({
    pluginId: entry.pluginID,
    key: entry.key,
    value: entry.value
  }))
}

export function extractLibrarySource(nc: NodeChange): SceneNode['librarySource'] {
  return readNodeChangePluginData(nc, librarySource) ?? null
}

export function applyLibrarySourcePluginData(node: SceneNode): void {
  node.pluginData = withPluginData(node.pluginData, librarySource, node.librarySource ?? undefined)
}

export function extractPluginRelaunchData(nc: NodeChange): PluginRelaunchDataEntry[] {
  return (nc.pluginRelaunchData ?? []).map((entry) => ({
    pluginId: entry.pluginID,
    command: entry.command,
    message: entry.message,
    isDeleted: entry.isDeleted
  }))
}

export function mergePluginData(pluginData: PluginDataEntry[]): PluginData[] {
  return pluginData.map((entry) => ({
    pluginID: entry.pluginId,
    key: entry.key,
    value: entry.value
  }))
}

export function serializePluginRelaunchData(
  entries: PluginRelaunchDataEntry[]
): PluginRelaunchData[] {
  return entries.map((entry) => ({
    pluginID: entry.pluginId,
    command: entry.command,
    message: entry.message,
    isDeleted: entry.isDeleted
  }))
}

/** Figma has no mesh paint; native records keep a solid preview and this lossless payload. */
function meshPaintPayload(fill: Fill) {
  v.parse(fillSchema, fill)
  return pick(fill, ['type', 'color', 'opacity', 'visible', 'blendMode', 'meshGradient'])
}

export function applyMeshPaintsPluginData(
  node: Pick<SceneNode, 'fills' | 'strokes' | 'pluginData'>
): void {
  for (const paint of [...node.fills, ...node.strokes])
    if (paint.type === 'GRADIENT_MESH') v.parse(meshGradientSchema, paint.meshGradient)
  const fills = node.fills.map((fill) =>
    fill.type === 'GRADIENT_MESH' ? meshPaintPayload(fill) : null
  )
  const strokes = node.strokes.map((fill) =>
    fill.type === 'GRADIENT_MESH' ? meshPaintPayload(fill) : null
  )
  node.pluginData = withPluginData(
    node.pluginData,
    OPEN_PENCIL_PLUGIN_DATA.meshPaints,
    fills.some(Boolean) || strokes.some(Boolean) ? { fills, strokes } : undefined
  )
}

export function restoreMeshPaints<T extends Fill>(
  paints: T[],
  nc: Pick<NodeChange, 'pluginData'>,
  field: 'fills' | 'strokes'
): T[] {
  const payload = readNodeChangePluginData(nc, OPEN_PENCIL_PLUGIN_DATA.meshPaints)
  if (!payload) return paints
  return paints.map((paint, index) => {
    const mesh = payload[field][index]
    return mesh?.type === 'GRADIENT_MESH' && mesh.meshGradient
      ? { ...paint, ...structuredClone(meshPaintPayload(mesh)) }
      : paint
  })
}

/** Paint slots keep presets distinct when identical PNG frames share a FIG content hash. */
export function applyShaderPaintsPluginData(
  node: Pick<SceneNode, 'fills' | 'strokes' | 'pluginData'>,
  images: ReadonlyMap<string, Uint8Array>
): void {
  const slot = (paint: Fill) => {
    const shader = shaderOfPaint(node, paint)
    if (!shader) return null
    const bytes = images.get(shader.image)
    return { shader, image: bytes ? computeImageHash(bytes) : shader.image }
  }
  const fills = node.fills.map(slot)
  const strokes = node.strokes.map(slot)
  node.pluginData = withPluginData(
    node.pluginData,
    OPEN_PENCIL_PLUGIN_DATA.shaderSlots,
    fills.some(Boolean) || strokes.some(Boolean) ? { fills, strokes } : undefined
  )
}

/** Restore mutable frame identities without changing Figma's content-addressed image records. */
export function restoreShaderPaints(graph: SceneGraph, node: SceneNode): void {
  const slots = readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.shaderSlots)
  if (!slots) return
  const shaders: ShaderPaint[] = []
  const restore = <T extends Fill>(paints: T[], field: 'fills' | 'strokes'): T[] =>
    paints.map((paint, index) => {
      const saved = slots[field][index]
      if (!saved || paint.type !== 'IMAGE' || paint.imageHash !== saved.image) return paint
      const image = computeImageHash(
        new TextEncoder().encode(
          JSON.stringify([
            'shader',
            node.id,
            field,
            index,
            saved.image,
            shaderPresetKey(saved.shader.preset)
          ])
        )
      )
      const bytes = graph.images.get(saved.image)
      if (bytes) graph.images.set(image, bytes)
      shaders.push({ ...saved.shader, image })
      return { ...paint, imageHash: image }
    })
  node.fills = restore(node.fills, 'fills')
  node.strokes = restore(node.strokes, 'strokes')
  node.pluginData = withShaderPaints(node, [...node.fills, ...node.strokes], shaders)
}
