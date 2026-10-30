import { expect, test } from 'bun:test'

import { ref, toRaw } from 'vue'

import type { Fill } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'
import { gradientPoint } from '@open-pencil/scene-graph/gradient'

import { useFill } from '#vue/primitives/Fill/useFill'

test.each(['#D9D9D9', '#FF0000', '#FF000080'])(
  'paint category conversion uses Pen defaults for %s and clears old category data',
  (color) => {
    const fill = ref<Fill>(colorToFill(color))
    const controls = useFill(fill, (next) => {
      fill.value = next
    })
    controls.toGradient()
    const transform = fill.value.gradientTransform
    if (!transform) throw new Error('Converted gradient has no transform')
    expect(gradientPoint(transform, { x: 0, y: 0.5 })).toEqual({ x: 0.5, y: 1 })
    expect(gradientPoint(transform, { x: 1, y: 0.5 })).toEqual({ x: 0.5, y: 0 })
    expect(toRaw(fill.value)).toMatchObject({
      type: 'GRADIENT_LINEAR',
      opacity: 1,
      visible: true,
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
      ]
    })
    const originalGradient = fill.value
    controls.toGradient()
    expect(fill.value).toBe(originalGradient)
    fill.value = {
      ...fill.value,
      opacity: 0.25,
      gradientStops: [{ position: 0.2, color: { r: 0, g: 1, b: 0, a: 0.5 } }]
    }
    controls.toSolid()
    expect(fill.value).toEqual(colorToFill('#D9D9D9'))
    controls.toGradient()
    expect(fill.value.gradientStops).toEqual([
      { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
    ])
  }
)
