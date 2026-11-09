import { CORNER_FIELDS } from '@open-pencil/scene-graph/fields'

import type { NodeFields, PenOverride } from './schema'

const PLACEMENT_FIELDS = ['x', 'y', 'rotation', 'flipX', 'flipY'] as const

/** What `applyStroke` writes: a stroke's weight and alignment are its paints'. */
const STROKE_WRITES = [
  'strokes',
  'independentStrokeWeights',
  'borderTopWeight',
  'borderRightWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'strokeCap',
  'strokeJoin'
] as const

/**
 * The layer fields each property `applyPenProperties` reads writes. A property that writes none of
 * the layer's own fields maps to none: bookkeeping, the decorations pen.dev does not draw, and an
 * icon's glyph, which is the layer's children or the component it shows.
 */
const PROPERTY_FIELDS = {
  name: ['name'],
  context: ['pluginData'],
  x: PLACEMENT_FIELDS,
  y: PLACEMENT_FIELDS,
  width: ['width'],
  height: ['height'],
  reusable: [],
  theme: ['variableModes'],
  enabled: ['visible'],
  opacity: ['opacity'],
  flipX: PLACEMENT_FIELDS,
  flipY: PLACEMENT_FIELDS,
  layoutPosition: ['layoutPositioning'],
  rotation: PLACEMENT_FIELDS,
  fill: ['fills'],
  stroke: STROKE_WRITES,
  strokeWidth: STROKE_WRITES,
  strokeLinecap: ['strokes', 'strokeCap'],
  strokeLinejoin: ['strokes', 'strokeJoin'],
  strokeAlignment: ['strokes'],
  effect: ['effects'],
  cornerRadius: CORNER_FIELDS,
  layout: ['layoutMode'],
  gap: ['itemSpacing'],
  layoutIncludeStroke: ['strokesIncludedInLayout'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  justifyContent: ['primaryAxisAlign'],
  alignItems: ['counterAxisAlign'],
  clip: ['clipsContent'],
  placeholder: [],
  slot: [],
  innerRadius: ['arcData'],
  startAngle: ['arcData'],
  sweepAngle: ['arcData'],
  polygonCount: ['pointCount'],
  geometry: ['vectorNetwork'],
  fillRule: ['vectorNetwork'],
  viewBox: ['vectorNetwork'],
  content: ['text'],
  color: ['fills'],
  textGrowth: ['textAutoResize'],
  fontFamily: ['fontFamily'],
  fontSize: ['fontSize'],
  fontWeight: ['fontWeight'],
  fontStyle: ['italic'],
  letterSpacing: ['letterSpacing'],
  lineHeight: ['lineHeight'],
  textAlign: ['textAlignHorizontal'],
  textAlignVertical: ['textAlignVertical'],
  underline: [],
  strikethrough: [],
  href: [],
  library: [],
  icon: [],
  weight: [],
  iconFontName: [],
  iconFontFamily: [],
  scriptUri: ['script/uri'],
  inputs: ['script/inputs'],
  ref: []
} satisfies Record<keyof NodeFields, readonly string[]>

const isProperty = (key: string): key is keyof typeof PROPERTY_FIELDS => key in PROPERTY_FIELDS

/**
 * The fields the properties `pen` carries write, whatever their values: pen.dev keeps a property
 * an instance sets even when it equals its component's, so a later change to the component does
 * not reach it.
 */
export function fieldsSetBy(pen: PenOverride): string[] {
  return Object.keys(pen).flatMap((key) => (isProperty(key) ? PROPERTY_FIELDS[key] : []))
}
