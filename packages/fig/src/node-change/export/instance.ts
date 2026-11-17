import type { DerivedSymbolOverride } from '#fig/instance-overrides/types'

import type { SceneNode } from '@open-pencil/scene-graph'

import { snapshotInstanceGeometry } from '../instance/geometry'
import {
  getOrCreateNodeGuid,
  instanceGuidResolver,
  resolveInstanceComponentId,
  type KiwiNodeChange,
  type KiwiSymbolOverridePayload,
  type SceneNodeToKiwiContext
} from './context'
import { overridableNodeFields } from './fields'
import { exportNodeSize, exportNodeTransform } from './geometry'
import { mergeOverrides, serializeRuntimePropertyOverrides } from './override-claims'
import { materializeFigmaPayload } from './raw-payload'

function applyUniformScale(node: SceneNode, symbolData: Record<string, unknown>): void {
  if (!Number.isFinite(node.componentScale) || node.componentScale <= 0)
    throw new Error('Invalid instance uniform scale')
  if (node.componentScale !== 1 || node.source.fig.uniformScaleFactor != null) {
    symbolData.uniformScaleFactor = node.componentScale
  }
}

function applySymbolData(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const componentId = node.componentId
  if (!componentId) return
  const symbolID = getOrCreateNodeGuid(
    context,
    resolveInstanceComponentId(context, componentId),
    localIdCounter
  )
  if (symbolID) {
    const symbolData: Record<string, unknown> = { symbolID }
    const symbolOverrides: KiwiSymbolOverridePayload[] = []
    if (node.source.fig.symbolOverrides.length > 0) {
      symbolOverrides.push(
        ...(materializeFigmaPayload(node.source.fig.symbolOverrides, context.blobs, {
          blobIndexByHex: context.blobIndexByHex,
          includePaintVariables: true,
          includeVariableMaps: true
        }) as KiwiSymbolOverridePayload[])
      )
    }
    mergeOverrides(
      symbolOverrides,
      serializeRuntimePropertyOverrides(context, node, localIdCounter, (target) =>
        overridableNodeFields(context, target)
      )
    )
    if (symbolOverrides.length > 0) symbolData.symbolOverrides = symbolOverrides
    applyUniformScale(node, symbolData)
    nc.symbolData = symbolData as KiwiNodeChange['symbolData']
  }
}

function applyRetainedAssignments(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange
): void {
  if (
    node.source.fig.componentPropAssignments.length > 0 &&
    !node.source.editedFields.includes('componentPropertyAssignments')
  ) {
    nc.componentPropAssignments = materializeFigmaPayload(
      node.source.fig.componentPropAssignments,
      context.blobs,
      {
        blobIndexByHex: context.blobIndexByHex,
        includePaintVariables: true,
        includeVariableMaps: true
      }
    )
  }
}

function applyDerivedGeometry(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  const retainedGeometry = materializeFigmaPayload(
    node.source.fig.derivedSymbolData,
    context.blobs,
    {
      blobIndexByHex: context.blobIndexByHex,
      includePaintVariables: true,
      includeVariableMaps: true
    }
  ) as DerivedSymbolOverride[]
  nc.derivedSymbolData = snapshotInstanceGeometry(
    context.graph,
    node,
    instanceGuidResolver(context, localIdCounter),
    retainedGeometry,
    (target) => ({ size: exportNodeSize(target), transform: exportNodeTransform(context, target) })
  )
  if (node.source.fig.derivedSymbolDataLayoutVersion != null) {
    nc.derivedSymbolDataLayoutVersion = node.source.fig.derivedSymbolDataLayoutVersion
  }
}

export function applyInstancePayload(
  context: SceneNodeToKiwiContext,
  node: SceneNode,
  nc: KiwiNodeChange,
  localIdCounter: { value: number }
): void {
  if (node.type !== 'INSTANCE' || !node.componentId) return
  applySymbolData(context, node, nc, localIdCounter)
  applyRetainedAssignments(context, node, nc)
  applyDerivedGeometry(context, node, nc, localIdCounter)
}
