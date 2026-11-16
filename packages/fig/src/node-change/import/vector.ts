import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type {
  SceneNode,
  StrokeCap,
  StrokeJoin,
  VectorNetwork,
  ArcData
} from '@open-pencil/scene-graph'
import { DEFAULT_STROKE_MITER_LIMIT } from '@open-pencil/scene-graph/constants'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { expandPathTextLayoutBox } from '../path/text-layout'
import { extractTextPathBox } from '../plugin-data'
import {
  alignGeometryWindingRules,
  resolveGeometryPaths,
  resolveVectorNetwork,
  resolveVectorStyleOverrideFills
} from '../vector/geometry'
import {
  decodeVectorNetworkBlob,
  textPathStartSegment,
  type StyleOverride
} from '../vector/network'
import { mapArcData } from './geometry'

function getVectorStrokeCap(nc: NodeChange): StrokeCap {
  // Per-vertex caps stay on the vector network; promoting one to the node
  // cap would put a head on both ends of a one-ended arrow.
  return (nc.strokeCap ?? 'NONE') as StrokeCap
}

function getVectorStrokeJoin(nc: NodeChange, vectorNetwork: VectorNetwork | null): StrokeJoin {
  return (nc.strokeJoin ??
    vectorNetwork?.vertices.find((v) => v.strokeJoin)?.strokeJoin ??
    'MITER') as StrokeJoin
}
export function convertTextPathData(
  nc: NodeChange,
  blobs: Uint8Array[]
): SceneNode['textPathData'] {
  if (nc.type !== 'TEXT_PATH') return null
  const vectorData = nc.vectorData as
    | {
        vectorNetworkBlob?: number
        normalizedSize?: Vector
        styleOverrideTable?: StyleOverride[]
      }
    | undefined
  const blobIndex = vectorData?.vectorNetworkBlob
  const normalizedSize = vectorData?.normalizedSize
  if (
    typeof blobIndex !== 'number' ||
    !normalizedSize ||
    normalizedSize.x <= 0 ||
    normalizedSize.y <= 0
  ) {
    return null
  }
  return decodeTextPathData(nc, blobs[blobIndex], normalizedSize, vectorData.styleOverrideTable)
}

function decodeTextPathData(
  nc: NodeChange,
  blob: Uint8Array,
  normalizedSize: Vector,
  overrides: StyleOverride[] | undefined
): SceneNode['textPathData'] {
  const textPathStart = nc.textPathStart as { tValue?: number; forward?: boolean } | undefined
  try {
    return {
      network: decodeVectorNetworkBlob(blob, overrides),
      normalizedSize: { x: normalizedSize.x, y: normalizedSize.y },
      tValue: textPathStart?.tValue ?? 0,
      forward: textPathStart?.forward ?? true,
      startSegment: textPathStartSegment(blob)
    }
  } catch {
    return null
  }
}

export function convertVectorAndStrokeProps(nc: NodeChange, blobs: Uint8Array[]) {
  const vectorNetwork = resolveVectorNetwork(nc, blobs)
  const strokeCap = getVectorStrokeCap(nc)
  const strokeJoin = getVectorStrokeJoin(nc, vectorNetwork)
  const fillGeometry = alignGeometryWindingRules(
    resolveGeometryPaths(nc.fillGeometry, blobs, resolveVectorStyleOverrideFills(nc)),
    vectorNetwork
  )
  return {
    vectorNetwork,
    fillGeometry,
    strokeGeometry: resolveGeometryPaths(nc.strokeGeometry, blobs),
    arcData: mapArcData(nc.arcData as Partial<ArcData> | undefined),
    strokeCap,
    strokeJoin,
    dashPattern: nc.dashPattern ?? [],
    borderTopWeight: (nc.borderTopWeight ?? 0) as number,
    borderRightWeight: (nc.borderRightWeight ?? 0) as number,
    borderBottomWeight: (nc.borderBottomWeight ?? 0) as number,
    borderLeftWeight: (nc.borderLeftWeight ?? 0) as number,
    independentStrokeWeights: (nc.borderStrokeWeightsIndependent ?? false) as boolean,
    strokeMiterLimit: (nc.miterLimit ?? DEFAULT_STROKE_MITER_LIMIT) as number
  }
}

export function applyImportedTextPathLayout(
  props: Parameters<typeof expandPathTextLayoutBox>[0],
  nc: NodeChange,
  textPathData: SceneNode['textPathData']
): void {
  // See path/text-layout.ts — expand the layout box before node creation so
  // clipsContent parents don't shave overflowing path lettering at first paint.
  expandPathTextLayoutBox(props, textPathData)
  // A saved OpenPencil doc carries the true textPathBox (reflow may have
  // scaled it); the expand-time reconstruction is only right for pristine
  // Figma exports. Plugin box is in pre-expansion local coords — expand's
  // shift is textPathBox.x/y by construction, so re-home it.
  const pluginBox = extractTextPathBox(nc)
  if (pluginBox && props.textPathBox) {
    props.textPathBox = {
      x: pluginBox.x + props.textPathBox.x,
      y: pluginBox.y + props.textPathBox.y,
      width: pluginBox.width,
      height: pluginBox.height
    }
  }
}
