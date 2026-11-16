import { clamp } from 'es-toolkit'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import type { SceneNode, ArcData } from '@open-pencil/scene-graph'
import { getNodeLocalMatrix } from '@open-pencil/scene-graph/coordinate'
import { POINT_COUNT_RANGE } from '@open-pencil/scene-graph/polygon'
import { isShapeWithTextType } from '@open-pencil/scene-graph/shape-with-text'

import { mapNodeType } from './identity'

export function mapArcData(data?: Partial<ArcData>): ArcData | null {
  if (!data) return null
  return {
    startingAngle: data.startingAngle ?? 0,
    endingAngle: data.endingAngle ?? 2 * Math.PI,
    innerRadius: data.innerRadius ?? 0
  }
}

function importedFrame(nc: NodeChange) {
  return {
    width: nc.size?.x ?? 100,
    height: nc.size?.y ?? 100,
    x: nc.transform?.m02 ?? 0,
    y: nc.transform?.m12 ?? 0
  }
}

export function convertFigmaTransformProps(
  nc: NodeChange
): Pick<SceneNode, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'flipX' | 'flipY'> {
  const { width, height, x: initialX, y: initialY } = importedFrame(nc)
  let x = initialX
  let y = initialY
  let rotation = 0
  let flipX = false
  const type = mapNodeType(nc.type)
  // Documents and variables are not placed; every layer type is.
  if (nc.transform && type !== 'DOCUMENT' && type !== 'VARIABLE') {
    const t = nc.transform
    const det = t.m00 * t.m11 - t.m01 * t.m10
    if (det < 0) flipX = true
    rotation = Math.atan2(t.m10, flipX ? t.m11 : t.m00) * (180 / Math.PI)

    // Reflected rotations need their angle read from the second row; treating them as ordinary
    // rotations reverses connector instances by 180°. The Scene Graph's placement at the origin,
    // with its own pivot and reflection, then gives the translation Figma's matrix adds.
    const placed = getNodeLocalMatrix({
      type,
      x: 0,
      y: 0,
      width,
      height,
      rotation,
      flipX,
      flipY: false
    })
    x = t.m02 - placed[2]
    y = t.m12 - placed[5]
  }

  return { x, y, width, height, rotation, flipX, flipY: false }
}

export function convertCornerProps(
  nc: NodeChange
): Pick<
  SceneNode,
  | 'cornerRadius'
  | 'topLeftRadius'
  | 'topRightRadius'
  | 'bottomRightRadius'
  | 'bottomLeftRadius'
  | 'independentCorners'
  | 'cornerSmoothing'
> {
  const radius = nc.cornerRadius ?? 0
  return {
    cornerRadius: radius,
    topLeftRadius: nc.rectangleTopLeftCornerRadius ?? radius,
    topRightRadius: nc.rectangleTopRightCornerRadius ?? radius,
    bottomRightRadius: nc.rectangleBottomRightCornerRadius ?? radius,
    bottomLeftRadius: nc.rectangleBottomLeftCornerRadius ?? radius,
    independentCorners: nc.rectangleCornerRadiiIndependent ?? false,
    cornerSmoothing: nc.cornerSmoothing ?? 0
  }
}

/**
 * A polygon's sides or a star's points and inner ratio, which Figma writes for both kinds. The
 * wire format allows far more points than Figma keeps, and any inner scale, so both are held to
 * Figma's ranges before the outline is built from them.
 */
export function convertPolygonProps(
  nc: NodeChange
): Partial<Pick<SceneNode, 'pointCount' | 'starInnerRadius'>> {
  const props: Partial<Pick<SceneNode, 'pointCount' | 'starInnerRadius'>> = {}
  if (nc.count !== undefined)
    props.pointCount = clamp(nc.count, POINT_COUNT_RANGE.min, POINT_COUNT_RANGE.max)
  if (nc.starInnerScale !== undefined && Number.isFinite(nc.starInnerScale))
    props.starInnerRadius = clamp(nc.starInnerScale, 0, 1)
  return props
}

/** A size a record gives, or 0 (unset) when it is missing, negative or not a finite number. */
function givenSize(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * A FigJam shape with text's kind, the height it was given and whether it keeps that height; its
 * label is read as a sublayer.
 */
export function convertShapeWithTextProps(
  nc: NodeChange
): Partial<Pick<SceneNode, 'shapeWithTextType' | 'shapeUserHeight' | 'shapeTruncates'>> {
  if (nc.type !== 'SHAPE_WITH_TEXT') return {}
  const kind = isShapeWithTextType(nc.shapeWithTextType) ? nc.shapeWithTextType : 'SQUARE'
  return {
    shapeWithTextType: kind,
    shapeUserHeight: givenSize(nc.shapeUserHeight),
    shapeTruncates: nc.shapeTruncates === true
  }
}
