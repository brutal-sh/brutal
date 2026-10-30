import { expect, test } from 'bun:test'

import { ref } from 'vue'

import type { Fill } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'

import { fillSwatchBackground } from '#vue/primitives/Fill/useFill'
import { useGradientStops } from '#vue/primitives/GradientEditor/useGradientStops'

test('one remaining gradient stop stays editable and has valid solid previews', () => {
  const fill = ref<Fill>({
    ...colorToFill('#000000'),
    type: 'GRADIENT_LINEAR',
    opacity: 0.5,
    gradientStops: [
      { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 1, a: 0.5 } }
    ]
  })
  const controls = useGradientStops(fill, (next) => {
    fill.value = next
  })
  controls.selectStop(1)
  controls.removeStop(0)
  expect(fill.value.gradientStops).toEqual([{ position: 1, color: { r: 0, g: 0, b: 1, a: 0.5 } }])
  expect(controls.activeStopIndex.value).toBe(0)
  expect(controls.barBackground.value).toBe('rgba(0, 0, 255, 0.5)')
  expect(fillSwatchBackground(fill.value)).toBe('rgba(0, 0, 255, 0.25)')
  controls.removeStop(0)
  expect(fill.value.gradientStops).toHaveLength(1)
  controls.updateStopColor(0, '00ff00')
  expect(fill.value.gradientStops?.[0].color).toMatchObject({ r: 0, g: 1, b: 0 })
  controls.addStop()
  expect(fill.value.gradientStops).toHaveLength(2)
})
