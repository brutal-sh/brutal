import { contrastRatio, readableForeground } from '#scene-graph/color/contrast'
import type { Color } from '#scene-graph/primitives'
import { converter } from 'culori'

export const NOTE_BACKGROUND = '#FEE484'
export const NOTE_PADDING = 24
export const NOTE_MIN_WIDTH = 250
export const NOTE_MIN_HEIGHT = 219

export const NOTE_COLORS = {
  yellow: '#FEE484',
  orange: '#FFCC98',
  coral: '#FFBEB2',
  pink: '#FDC0D7',
  purple: '#DCC5F9',
  blue: '#AEDEFF',
  green: '#B3EBBD',
  gray: '#DBDEE1'
} as const

const toHSL = converter('hsl')
const toRGB = converter('rgb')

/** Pen Notes tint their text toward the background hue, with a contrast fallback. */
export function noteForeground(background: Color): Color {
  const fallback = readableForeground(background)
  const hsl = toHSL({ mode: 'rgb', ...background })
  const rgb = toRGB({ ...hsl, s: hsl.s * 0.25, l: fallback.r === 1 ? 0.92 : 0.25 })
  const tinted = { r: rgb.r, g: rgb.g, b: rgb.b, a: 1 }
  return contrastRatio(background, tinted) >= 4.6 ? tinted : { ...fallback }
}
