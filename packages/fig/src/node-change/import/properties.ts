import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { guidToString } from '@open-pencil/kiwi/fig/guid'
import type {
  SceneNode,
  NodeType,
  Fill,
  LayoutGrid,
  SharedStyleType,
  VariableModeMap
} from '@open-pencil/scene-graph'
import { DEFAULT_STROKE_WEIGHT } from '@open-pencil/scene-graph/constants'
import type { GUID } from '@open-pencil/scene-graph/primitives'

import { importCanvasGuides } from '../canvas-guides'
import { convertEffects, convertFills, convertStrokeAlign, convertStrokes } from '../paint'
import {
  extractBoundVariables,
  extractExportSettings,
  extractLibrarySource,
  extractPluginData,
  restoreMeshPaints,
  restoreIconFills,
  extractPluginRelaunchData
} from '../plugin-data'
import { extractNodeStatus } from '../status'
import { styleRefId } from '../style/refs'
import { numericVariableAssignmentScales, sourceVariableBindingScales } from '../variable/bindings'
import { convertFigmaTransformProps } from './geometry'
import { extractSourceMetadata, extractOccurrenceMetadata } from './source'

interface FigVariableModeMap {
  entries?: Array<{
    variableSetID?: { guid?: GUID }
    variableModeID?: GUID
  }>
}

function extractVariableModes(nc: NodeChange): VariableModeMap {
  const result: VariableModeMap = {}
  const modeMap = nc.variableModeBySetMap as FigVariableModeMap | undefined
  for (const entry of modeMap?.entries ?? []) {
    const collectionGuid = entry.variableSetID?.guid
    const modeGuid = entry.variableModeID
    if (!collectionGuid || !modeGuid) continue
    result[guidToString(collectionGuid)] = guidToString(modeGuid)
  }
  return result
}
function mapBooleanOperation(nc: NodeChange): SceneNode['booleanOperation'] {
  if (nc.type !== 'BOOLEAN_OPERATION') return undefined
  const operation = nc.booleanOperation as NodeChange['booleanOperation'] | 'EXCLUDE' | undefined
  switch (operation) {
    case 'SUBTRACT':
    case 'INTERSECT':
      return operation
    case 'EXCLUDE':
    case 'XOR':
      return 'EXCLUDE'
    default:
      return 'UNION'
  }
}
function sharedStyleType(value: string | undefined): SharedStyleType | null {
  if (value === 'FILL' || value === 'TEXT' || value === 'EFFECT' || value === 'GRID') return value
  return null
}

function convertLayoutGrids(value: unknown): LayoutGrid[] {
  return Array.isArray(value) ? structuredClone(value as LayoutGrid[]) : []
}

export function convertNodeProps(
  nc: NodeChange,
  nodeType: NodeType | 'DOCUMENT' | 'VARIABLE',
  blobs: Uint8Array[],
  metadata: 'source' | 'occurrence'
) {
  return {
    nodeType,
    name: nc.name ?? nodeType,
    source:
      metadata === 'source' ? extractSourceMetadata(nc, blobs) : extractOccurrenceMetadata(nc),
    ...convertFigmaTransformProps(nc),
    opacity: nc.opacity ?? 1,
    visible: nc.visible ?? true,
    locked: nc.locked ?? false,
    internalOnly: nc.internalOnly === true || sharedStyleType(nc.styleType) !== null,
    blendMode: (nc.blendMode as Fill['blendMode']) ?? 'PASS_THROUGH',
    booleanOperation: mapBooleanOperation(nc)
  }
}

export function convertAppearanceProps(
  nc: NodeChange,
  vectorAndStrokeProps: Pick<SceneNode, 'strokeCap' | 'strokeJoin'>
) {
  return {
    fills: restoreIconFills(nc, restoreMeshPaints(convertFills(nc.fillPaints), nc, 'fills')),
    strokes: restoreMeshPaints(
      convertStrokes(
        nc.strokePaints,
        nc.strokeWeight,
        nc.strokeAlign,
        vectorAndStrokeProps.strokeCap,
        vectorAndStrokeProps.strokeJoin,
        nc.dashPattern ?? []
      ),
      nc,
      'strokes'
    ),
    strokeWeight: nc.strokeWeight ?? DEFAULT_STROKE_WEIGHT,
    strokeAlign: convertStrokeAlign(nc.strokeAlign),
    effects: convertEffects(nc.effects),
    layoutGrids: convertLayoutGrids(nc.layoutGrids),
    guides: importCanvasGuides(nc.guides),
    fillStyleId: styleRefId(nc.styleIdForFill),
    strokeStyleId: styleRefId(nc.styleIdForStrokeFill),
    textStyleId: styleRefId(nc.styleIdForText),
    effectStyleId: styleRefId(nc.styleIdForEffect),
    gridStyleId: styleRefId(nc.styleIdForGrid),
    sharedStyleType: sharedStyleType(nc.styleType)
  }
}

export function convertNodeFlags(nc: NodeChange) {
  return {
    isMask: nc.mask ?? false,
    // A .fig file stores a vector mask as OUTLINE.
    maskType: (nc.maskType === 'OUTLINE' ? 'VECTOR' : (nc.maskType ?? 'ALPHA')) as
      | 'ALPHA'
      | 'VECTOR'
      | 'LUMINANCE',
    maskIsOutline: nc.maskIsOutline ?? false,
    expanded: true,
    autoRename: (nc.autoRename ?? true) as boolean
  }
}

export function convertNodeMetadata(nc: NodeChange) {
  return {
    boundVariables: extractBoundVariables(nc),
    variableAssignmentScales: numericVariableAssignmentScales(),
    variableBindingScales: sourceVariableBindingScales(nc),
    variableModes: extractVariableModes(nc),
    exportSettings: extractExportSettings(nc),
    status: extractNodeStatus(nc),
    pluginData: extractPluginData(nc),
    librarySource: extractLibrarySource(nc),
    pluginRelaunchData: extractPluginRelaunchData(nc),
    clipsContent: nc.frameMaskDisabled === false && nc.resizeToFit !== true
  }
}
