import { effectiveFigmaRawNodeFields, effectiveFigmaSourcePayload } from '#fig/source-metadata'

import type { SceneNode } from '@open-pencil/scene-graph'
import type { Matrix, Vector } from '@open-pencil/scene-graph/primitives'

import type { SceneNodeToKiwiContext } from './context'

/** Whether the node is still saved in the box Figma gave it, not in its own. */
export function savedInFigmaBox(node: SceneNode): boolean {
  const payload = effectiveFigmaSourcePayload(node)
  return !!payload.rawSize && !!payload.rawTransform
}

export function exportNodeSize(node: SceneNode): Vector {
  // rawSize and rawTransform are a matched pair describing the ORIGINAL Figma
  // box. Once the transform no longer backs the node, exportNodeTransform
  // recomputes it from node dims via computeExportTransform; pairing that with
  // an un-expanded rawSize disagrees about the box (for rotation, a different
  // centre) and the node drifts on reimport. Use rawSize only while the
  // transform still backs it.
  const { rawSize } = effectiveFigmaSourcePayload(node)
  return rawSize && savedInFigmaBox(node) ? { ...rawSize } : { x: node.width, y: node.height }
}

export function exportNodeTransform(context: SceneNodeToKiwiContext, node: SceneNode): Matrix {
  const rawTransform = effectiveFigmaSourcePayload(node).rawTransform
  return rawTransform ? { ...rawTransform } : context.computeExportTransform(node)
}

function hasRawGeometryPayload(node: SceneNode): boolean {
  const rawNodeFields = effectiveFigmaRawNodeFields(node)
  return 'fillGeometry' in rawNodeFields || 'strokeGeometry' in rawNodeFields
}

function hasRawVectorPayload(node: SceneNode): boolean {
  return 'vectorData' in effectiveFigmaRawNodeFields(node)
}

export function nodeForGeometryExport(node: SceneNode): SceneNode {
  if (!hasRawGeometryPayload(node) && !hasRawVectorPayload(node)) return node
  return {
    ...node,
    fillGeometry: hasRawGeometryPayload(node) ? [] : node.fillGeometry,
    strokeGeometry: hasRawGeometryPayload(node) ? [] : node.strokeGeometry,
    vectorNetwork: hasRawVectorPayload(node) ? null : node.vectorNetwork
  }
}
