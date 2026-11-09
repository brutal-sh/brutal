import type { SceneNode } from '#scene-graph/types'

import { NOTE_PADDING } from './appearance'

export const NOTE_FRAME_STYLE = {
  layoutMode: 'NONE',
  cornerRadius: NOTE_PADDING,
  independentCorners: false,
  clipsContent: false,
  strokes: [],
  itemSpacing: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  primaryAxisAlign: 'MIN',
  counterAxisAlign: 'MIN',
  strokesIncludedInLayout: false
} satisfies Partial<SceneNode>

export const NOTE_TEXT_STYLE = {
  x: NOTE_PADDING,
  y: NOTE_PADDING,
  fontFamily: 'Instrument Sans',
  fontSize: 15,
  fontWeight: 500,
  lineHeight: { value: 22, unit: 'PIXELS' },
  textAutoResize: 'NONE',
  opticalSizeFromFontSize: false
} satisfies Partial<SceneNode>
