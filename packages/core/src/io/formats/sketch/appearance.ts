import type { Fill, SceneNode, Stroke } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'

import type { SketchLayer, SketchPaint } from './schema'

const STROKE_POSITIONS = new Map<number, Stroke['align']>([
  [0, 'CENTER'],
  [1, 'INSIDE'],
  [2, 'OUTSIDE']
])
const TEXT_ALIGNMENTS = new Map<number, SceneNode['textAlignHorizontal']>([
  [0, 'LEFT'],
  [1, 'RIGHT'],
  [2, 'CENTER'],
  [3, 'JUSTIFIED']
])

function sketchColor(color: NonNullable<SketchPaint['color']>, opacity = 1): Fill {
  const { red: r, green: g, blue: b, alpha: a } = color
  return { type: 'SOLID', color: { r, g, b, a }, visible: true, opacity }
}

function solidPaint(paint: SketchPaint): Fill | undefined {
  if (paint.fillType !== 0 || !paint.color || paint.contextSettings?.blendMode) return undefined
  return sketchColor(paint.color, paint.contextSettings?.opacity)
}

function solidStroke(paint: SketchPaint): Stroke | undefined {
  const fill = solidPaint(paint)
  const align = STROKE_POSITIONS.get(paint.position ?? 0)
  if (!fill || !align || paint.thickness === undefined) return undefined
  return { ...fill, weight: paint.thickness, align }
}

function hasSketchEffects(style: SketchLayer['style']) {
  if (!style) return false
  return (
    style.shadows.some((effect) => effect.isEnabled) ||
    style.innerShadows.some((effect) => effect.isEnabled) ||
    style.blur?.isEnabled ||
    Boolean(style.contextSettings?.blendMode)
  )
}

export function sketchAppearance(layer: SketchLayer, omissions: Set<string>): Partial<SceneNode> {
  const style = layer.style
  let fills = style?.fills.filter((paint) => paint.isEnabled).map(solidPaint) ?? []
  const strokes = style?.borders.filter((paint) => paint.isEnabled).map(solidStroke) ?? []
  if (fills.some((fill) => !fill) || strokes.some((stroke) => !stroke)) omissions.add('paints')
  if (hasSketchEffects(style)) omissions.add('effects and blend modes')
  if (layer.hasBackgroundColor && layer.backgroundColor) {
    fills = [sketchColor(layer.backgroundColor), ...fills]
  }
  return {
    fills: fills.filter((fill) => fill !== undefined),
    strokes: strokes.filter((stroke) => stroke !== undefined),
    opacity: style?.contextSettings?.opacity ?? 1
  }
}

export function sketchText(layer: SketchLayer, omissions: Set<string>): Partial<SceneNode> {
  const text = layer.attributedString
  const attributes = text?.attributes[0]?.attributes
  const font = attributes?.MSAttributedStringFontAttribute?.attributes
  const color = attributes?.MSAttributedStringColorAttribute
  const paragraph = attributes?.paragraphStyle
  const height =
    paragraph && paragraph.minimumLineHeight === paragraph.maximumLineHeight
      ? paragraph.minimumLineHeight
      : undefined
  if ((text?.attributes.length ?? 0) > 1) omissions.add('rich text styles')
  const fill: Fill = color
    ? sketchColor(color)
    : { type: 'SOLID', color: BLACK, visible: true, opacity: 1 }
  return {
    text: text?.string ?? '',
    textAutoResize: 'NONE',
    textAlignHorizontal: TEXT_ALIGNMENTS.get(paragraph?.alignment ?? 0) ?? 'LEFT',
    ...(font && { fontFamily: font.name, fontSize: font.size }),
    ...(height && { lineHeight: { value: height, unit: 'PIXELS' } }),
    fills: [fill]
  }
}

export function sketchCorners(layer: SketchLayer): Partial<SceneNode> {
  if (layer.points.length !== 4) return { cornerRadius: layer.fixedRadius }
  const [topLeft, topRight, bottomRight, bottomLeft] = layer.points
  const radii = [topLeft, topRight, bottomRight, bottomLeft].map((point) => point.cornerRadius)
  if (radii.every((radius) => radius === topLeft.cornerRadius))
    return { cornerRadius: topLeft.cornerRadius }
  return {
    independentCorners: true,
    topLeftRadius: topLeft.cornerRadius,
    topRightRadius: topRight.cornerRadius,
    bottomRightRadius: bottomRight.cornerRadius,
    bottomLeftRadius: bottomLeft.cornerRadius
  }
}
