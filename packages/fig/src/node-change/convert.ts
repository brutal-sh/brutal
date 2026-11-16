import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type { SceneNode, NodeType } from '@open-pencil/scene-graph'

import { convertComponentProps } from './import/component'
import {
  convertCornerProps,
  convertPolygonProps,
  convertShapeWithTextProps
} from './import/geometry'
import { resolveNodeType } from './import/identity'
import { convertLayoutProps, convertDimensionProps, mapConstraint } from './import/layout'
import {
  convertNodeProps,
  convertAppearanceProps,
  convertNodeFlags,
  convertNodeMetadata
} from './import/properties'
import {
  convertTextPathData,
  convertVectorAndStrokeProps,
  applyImportedTextPathLayout
} from './import/vector'
import { convertTextProps } from './text/import'

export { convertEffects, convertFills, convertStrokes, setVariableColorResolver } from './paint'
export { importStyleRuns } from './style/runs'
export {
  convertLetterSpacing,
  convertLineHeight,
  figmaLetterSpacing,
  figmaLineHeight,
  mapTextDecoration
} from './text/values'
export { resolveGeometryPaths } from './vector/geometry'
export { VARIABLE_BINDING_FIELDS, VARIABLE_BINDING_FIELDS_INVERSE } from './variable/bindings'
export { mapArcData, convertFigmaTransformProps } from './import/geometry'
export {
  mapStackSizing,
  mapStackJustify,
  mapStackCounterAlign,
  mapAlignSelf
} from './import/layout'
export { FIGMA_RAW_NODE_FIELD_KEYS } from './import/source'

export function nodeChangeToProps(
  nc: NodeChange,
  blobs: Uint8Array[],
  metadata: 'source' | 'occurrence' = 'source'
): Partial<SceneNode> & { nodeType: NodeType | 'DOCUMENT' | 'VARIABLE' } {
  const nodeType = resolveNodeType(nc)
  const vectorAndStrokeProps = convertVectorAndStrokeProps(nc, blobs)
  const textPathData = convertTextPathData(nc, blobs)
  const props: Partial<SceneNode> & {
    nodeType: NodeType | 'DOCUMENT' | 'VARIABLE'
  } = {
    ...convertNodeProps(nc, nodeType, blobs, metadata),
    ...convertAppearanceProps(nc, vectorAndStrokeProps),
    ...convertCornerProps(nc),
    ...convertPolygonProps(nc),
    ...convertTextProps(nc, blobs),
    ...convertShapeWithTextProps(nc),
    horizontalConstraint: mapConstraint(nc.horizontalConstraint),
    verticalConstraint: mapConstraint(nc.verticalConstraint),
    ...convertLayoutProps(nc),
    ...vectorAndStrokeProps,
    ...convertDimensionProps(nc),
    ...convertNodeFlags(nc),
    ...convertNodeMetadata(nc),
    ...convertComponentProps(nc, nodeType)
  }
  applyImportedTextPathLayout(props, nc, textPathData)
  return props
}

export function sortChildren(
  children: string[],
  parentNc: NodeChange,
  nodeMap: Map<string, NodeChange>
): void {
  // Always sort by parentIndex.position first (canonical tree order)
  const stackMode = parentNc.stackMode as string | undefined
  const isHorizontal = stackMode === 'HORIZONTAL'
  const isVertical = stackMode === 'VERTICAL'

  children.sort((a, b) => {
    const aPos = childOrderKey(nodeMap.get(a))
    const bPos = childOrderKey(nodeMap.get(b))
    // Primary sort: parentIndex.position (exact tree order)
    if (aPos < bPos) return -1
    if (aPos > bPos) return 1

    // Tiebreaker for auto-layout: sort by transform position
    if (isHorizontal || isVertical) {
      const axis = isHorizontal ? 'm02' : 'm12'
      const aT = childAxisPosition(nodeMap.get(a), axis)
      const bT = childAxisPosition(nodeMap.get(b), axis)
      if (aT !== bT) return aT - bT
    }

    return 0
  })
}

function childOrderKey(nc: NodeChange | undefined): string {
  return nc?.parentIndex?.position ?? ''
}

function childAxisPosition(nc: NodeChange | undefined, axis: 'm02' | 'm12'): number {
  return nc?.transform?.[axis] ?? 0
}
