import { expect, test } from 'bun:test'

import { colorToCSSRGBA, tryParseColor } from '#scene-graph/color'

test('editable RGBA text retains alpha and round-trips byte colors', () => {
  for (const [a, expected] of [
    [0, 'rgba(18, 52, 86, 0)'],
    [0.5, 'rgba(18, 52, 86, 0.5)'],
    [128 / 255, 'rgba(18, 52, 86, 0.5019607843137255)'],
    [1, 'rgba(18, 52, 86, 1)']
  ] as const) {
    const color = { r: 18 / 255, g: 52 / 255, b: 86 / 255, a }
    const css = colorToCSSRGBA(color)
    expect(css).toBe(expected)
    expect(tryParseColor(css)).toEqual(color)
  }
})
