import type { NodeChange, Paint } from '@open-pencil/kiwi/fig/codec'
import type { SceneNode } from '@open-pencil/scene-graph'
import { isGeneratedFrame } from '@open-pencil/scene-graph/generated'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'
import type { GUID } from '@open-pencil/scene-graph/primitives'

import {
  applyExportSettingsPluginData,
  applyMeshPaintsPluginData,
  applyIconFillsPluginData,
  applyShaderPaintsPluginData,
  applyLibrarySourcePluginData,
  applyTextPathBoxPluginData,
  mergePluginData,
  serializePluginRelaunchData
} from '../plugin-data'
import { serializeNodeStatus } from '../status'
import { applyComponentMetadata, mergeParameterBindings } from './component-properties'
import {
  createStrokePaints,
  getOrCreateNodeGuid,
  type KiwiNodeChange,
  type SceneNodeToKiwiContext
} from './context'
import { applyNodeStateProps, applyNodeVisualProps, nodeToSerialize } from './fields'
import { generatedFrameRecord, writesGeneratedFrame } from './generated'
import {
  savedInFigmaBox,
  exportNodeSize,
  exportNodeTransform,
  nodeForGeometryExport
} from './geometry'
import { applyInstancePayload } from './instance'
import { exportOrderKey } from './order'
import { applyRawFigmaNodeFields } from './raw-payload'
import { applyVariableModes } from './variables'

export { buildComponentPropIndex } from './component-properties'
export type { KiwiNodeChange, SceneNodeToKiwiContext } from './context'
export { overridableNodeFields } from './fields'
export { buildAssetRefToVarGuidMap } from './variables'

type KiwiBooleanOperation = NonNullable<NodeChange['booleanOperation']>

interface NodeLocation {
  guid: GUID
  parentGuid: GUID
  childIndex: number
}

function toKiwiBooleanOperation(operation: SceneNode['booleanOperation']): KiwiBooleanOperation {
  return operation === 'EXCLUDE' ? 'XOR' : (operation ?? 'UNION')
}

/**
 * Import maps TEXT_PATH → TEXT. Re-emit Kiwi type 41 only while path fidelity
 * remains (materialized path data + baked glyphs). After an edit that cannot
 * reflow glyphs, invalidation clears the path data so export falls back to TEXT.
 */
function exportKiwiNodeType(node: SceneNode, context: SceneNodeToKiwiContext): string {
  const isPathText =
    node.textPathData !== null && node.type === 'TEXT' && (node.derivedTextGlyphs?.length ?? 0) > 0
  if (isPathText) return 'TEXT_PATH'
  // A generated frame that lost its template's layers is kept as a frame; see `writesGeneratedFrame`.
  if (isGeneratedFrame(node) && !writesGeneratedFrame(context, node)) return 'FRAME'
  return context.mapToFigmaType(node.type)
}

/**
 * An instance writes its contents on its own record, as a generated frame writes its sublayers;
 * a caller may write a record alone.
 */
function exportedChildren(node: SceneNode, context: SceneNodeToKiwiContext): SceneNode[] {
  if (
    node.type === 'INSTANCE' ||
    writesGeneratedFrame(context, node) ||
    context.writeChildren === false
  ) {
    return []
  }
  return context.graph
    .getChildren(node.id)
    .filter((child) => !child.internalOnly && child.sharedStyleType === null)
}

function initialNodeRecord(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  location: NodeLocation
): KiwiNodeChange {
  const exportType = exportKiwiNodeType(node, context)

  const nc: KiwiNodeChange = {
    guid: location.guid,
    parentIndex: {
      guid: location.parentGuid,
      position: exportOrderKey(context, node, location.childIndex)
    },
    type: exportType,
    name: node.name,
    visible: node.visible,
    opacity: node.opacity,
    phase: 'CREATED',
    size: exportNodeSize(node),
    transform: exportNodeTransform(context, node)
  }
  if (node.sharedStyleType) nc.styleType = node.sharedStyleType
  // Readers take a missing blend mode as pass-through, the layer default.
  if (node.blendMode !== 'PASS_THROUGH') nc.blendMode = node.blendMode
  if (node.type === 'GROUP') {
    nc.resizeToFit = true
  }
  return nc
}

function applySpecialNodeProps(node: SceneNode, nc: KiwiNodeChange, strokePaints: Paint[]): void {
  if (node.type === 'COMPONENT_SET')
    node.pluginData = withPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.nodeType, node.type)
  if (nc.type === 'CANVAS') nc.pageType = 'DESIGN'
  if (node.type === 'BOOLEAN_OPERATION')
    nc.booleanOperation = toKiwiBooleanOperation(node.booleanOperation)
  if (strokePaints.length > 0) nc.strokePaints = strokePaints
}

function applyNodePluginData(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  applyMeshPaintsPluginData(node)
  applyShaderPaintsPluginData(node, context.graph.images)
  applyIconFillsPluginData(node, context.graph.images)
  applyExportSettingsPluginData(node)
  applyLibrarySourcePluginData(node)
  serializeNodeStatus(node, nc)
  applyTextPathBoxPluginData(node, savedInFigmaBox(node))
  const pluginData = mergePluginData(node.pluginData)
  if (pluginData.length > 0) nc.pluginData = pluginData
  if (node.pluginRelaunchData.length > 0) {
    nc.pluginRelaunchData = serializePluginRelaunchData(node.pluginRelaunchData)
  }
}

// eslint-disable-next-line max-params -- Preserve the existing public five-argument API; see docs/FIG-EXPORT-COORDINATION.md.
export function sceneNodeToKiwiWithContext(
  source: SceneNode,
  parentGuid: GUID,
  childIndex: number,
  localIdCounter: { value: number },
  context: SceneNodeToKiwiContext
): KiwiNodeChange[] {
  const node = nodeToSerialize(context, source)
  const guid = getOrCreateNodeGuid(context, node.id, localIdCounter) ?? {
    sessionID: 1,
    localID: localIdCounter.value++
  }

  const strokePaints = createStrokePaints(context, node)

  const nc = initialNodeRecord(context, node, { guid, parentGuid, childIndex })
  applyNodeStateProps(node, nc)
  applyNodeVisualProps(context, node, nc)
  applyComponentMetadata(context, node, nc, localIdCounter)
  applyInstancePayload(context, node, nc, localIdCounter)
  applySpecialNodeProps(node, nc, strokePaints)

  context.serializeLayoutProps(node, nc)
  context.serializeGeometry(nodeForGeometryExport(node), nc, context.blobs)
  context.serializeVariableBindings(node, nc, context.graph, context.varIdToGuid)
  mergeParameterBindings(nc)
  applyRawFigmaNodeFields(context, node, nc)
  applyVariableModes(context, node, nc)

  applyNodePluginData(context, node, nc)

  const result: KiwiNodeChange[] = [generatedFrameRecord(context, node, nc) ?? nc]
  const children = exportedChildren(node, context)
  for (let i = 0; i < children.length; i++) {
    result.push(...context.sceneNodeToKiwi(children[i], guid, i, localIdCounter, context))
  }
  return result
}
