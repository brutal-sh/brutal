import { computed } from 'vue'
import type { Ref } from 'vue'

import type { Fill, GradientStop } from '@open-pencil/scene-graph'
import { colorToCSS, colorToFill } from '@open-pencil/scene-graph/color'
import { linearGradientTransformFromAxes } from '@open-pencil/scene-graph/gradient'
import type { Color } from '@open-pencil/scene-graph/primitives'

import type { FillCategory } from './types'

const FILL_CATEGORY: Partial<Record<Fill['type'], FillCategory>> = {
  SOLID: 'SOLID',
  GRADIENT_LINEAR: 'GRADIENT',
  GRADIENT_RADIAL: 'GRADIENT',
  GRADIENT_ANGULAR: 'GRADIENT',
  GRADIENT_DIAMOND: 'GRADIENT',
  GRADIENT_MESH: 'GRADIENT',
  IMAGE: 'IMAGE'
}

function effectiveColor(color: Color, opacity: number): Color {
  return { ...color, a: color.a * opacity }
}

function gradientCSS(stops: GradientStop[], opacity: number): string {
  return stops
    .map((stop) => `${colorToCSS(effectiveColor(stop.color, opacity))} ${stop.position * 100}%`)
    .join(', ')
}

export function fillCategory(fill: Fill): FillCategory {
  return FILL_CATEGORY[fill.type] ?? 'SOLID'
}

export function fillIsTransparent(fill: Fill): boolean {
  if (fill.opacity < 1) return true
  if (fill.type === 'GRADIENT_MESH')
    return fill.meshGradient?.colors.some((color) => color.a < 1) ?? true
  if (fillCategory(fill) === 'GRADIENT')
    return fill.gradientStops?.some((stop) => stop.color.a < 1) ?? fill.color.a < 1
  return fill.color.a < 1
}

export function fillSwatchBackground(fill: Fill): string {
  // Pen uses a semantic spectrum icon even when every mesh vertex is the same color.
  if (fill.type === 'GRADIENT_MESH')
    return 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #8000ff, #ffffff)'

  if (fillCategory(fill) === 'GRADIENT' && fill.gradientStops?.length) {
    if (fill.gradientStops.length === 1)
      return colorToCSS(effectiveColor(fill.gradientStops[0].color, fill.opacity))
    return `linear-gradient(to right, ${gradientCSS(fill.gradientStops, fill.opacity)})`
  }
  return colorToCSS(effectiveColor(fill.color, fill.opacity))
}

/** Fill category state and immutable conversion actions without picker or popover behavior. */
export function useFill(fill: Ref<Fill>, onUpdate: (fill: Fill) => void) {
  const category = computed(() => fillCategory(fill.value))
  const swatchBackground = computed(() => fillSwatchBackground(fill.value))
  const transparent = computed(() => fillIsTransparent(fill.value))

  function toSolid() {
    if (category.value === 'SOLID') return
    onUpdate(colorToFill('#D9D9D9'))
  }

  function toGradient() {
    if (category.value === 'GRADIENT') return
    const paint = colorToFill('#000000')
    onUpdate({
      ...paint,
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { color: paint.color, position: 0 },
        { color: colorToFill('#FFFFFF').color, position: 1 }
      ],
      gradientTransform: linearGradientTransformFromAxes(
        { x: 0.5, y: 1 },
        { x: 0.5, y: 0 },
        { x: 1, y: 0 }
      )
    })
  }

  function toImage() {
    if (category.value === 'IMAGE') return
    onUpdate({ ...fill.value, type: 'IMAGE' })
  }

  const actions = { toSolid, toGradient, toImage }

  return {
    category,
    swatchBackground,
    transparent,
    actions,
    toSolid,
    toGradient,
    toImage
  }
}
