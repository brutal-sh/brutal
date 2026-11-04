import { effectiveFigmaRawNodeFields } from '#fig/source-metadata'

import type { SceneNode } from '@open-pencil/scene-graph'
import { DEFAULT_STROKE_MITER_LIMIT } from '@open-pencil/scene-graph/constants'

import type { KiwiNodeChange } from './context'

export function applyStrokeGeometry(node: SceneNode, nc: KiwiNodeChange): void {
  if (node.independentStrokeWeights) {
    nc.borderStrokeWeightsIndependent = true
    nc.borderTopWeight = node.borderTopWeight
    nc.borderRightWeight = node.borderRightWeight
    nc.borderBottomWeight = node.borderBottomWeight
    nc.borderLeftWeight = node.borderLeftWeight
  }
  if (node.strokeCap !== 'NONE') nc.strokeCap = node.strokeCap
  const raw = effectiveFigmaRawNodeFields(node)
  if (node.strokeJoin !== 'MITER' || 'strokeJoin' in raw) nc.strokeJoin = node.strokeJoin
  if (node.strokeMiterLimit !== DEFAULT_STROKE_MITER_LIMIT || 'miterLimit' in raw)
    nc.miterLimit = node.strokeMiterLimit
  if (node.dashPattern.length > 0) nc.dashPattern = node.dashPattern
}
