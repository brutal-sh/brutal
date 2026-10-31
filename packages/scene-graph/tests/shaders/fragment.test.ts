import { describe, expect, test } from 'bun:test'

import {
  fragmentShaderOf,
  fragmentShaderPreset,
  fragmentUniforms
} from '@open-pencil/scene-graph/shaders'

describe('fragment shader controls', () => {
  test('bounds durable diagnostics and preserves the recoverable source behind them', () => {
    const shader = {
      url: 'missing.glsl',
      source: 'void main(){}',
      uniforms: {},
      error: 'File not found.'
    }
    expect(fragmentShaderOf(fragmentShaderPreset(shader))).toEqual(shader)
    expect(() => fragmentShaderPreset({ ...shader, error: 'x'.repeat(4097) })).toThrow()
  })
  test('ignores commented declarations and annotations separated by code', () => {
    const controls = fragmentUniforms(`
// uniform float ignored;
/* uniform vec3 also_ignored; */
/** @default 9 */ float unrelated;
uniform float real;
/** @default 7 */ uniform highp int count;
`)
    expect(controls.map(({ name, value }) => [name, value])).toEqual([
      ['real', 0],
      ['count', 7]
    ])
  })
  test('reads annotated defaults, bounds, vectors and automatic inputs', () => {
    const controls = fragmentUniforms(`
/** @resolution */ uniform vec2 resolution;
/** @label Size\n * @default 32\n * @range 1, 64\n */ uniform float size;
/** @label Ink\n * @color\n * @default #33669980\n */ uniform vec4 ink;
/** @default 0.25, 0.75 */ uniform vec2 offset;
/** @default 4\n * @min 1\n * @max 12 */ uniform int count;
/** @time */ uniform float time;
`)
    expect(controls.map((control) => control.value)).toEqual([
      [0, 0],
      32,
      '#33669980',
      [0.25, 0.75],
      4,
      0
    ])
    expect(controls[0].automatic).toBe('resolution')
    expect(controls[1]).toMatchObject({ label: 'Size', min: 1, max: 64 })
    expect(controls[2]).toMatchObject({ color: true, size: 4 })
    expect(controls[4]).toMatchObject({ integer: true, min: 1, max: 12 })
    expect(controls[5].automatic).toBe('time')
  })

  test('validates durable source and overrides independently of library presets', () => {
    const shader = {
      url: './checks.glsl',
      source: 'void main() {}',
      uniforms: { size: 24 }
    }
    const preset = fragmentShaderPreset(shader)
    expect(fragmentShaderOf(preset)).toEqual(shader)
    shader.uniforms.size = 8
    expect(fragmentShaderOf(preset)?.uniforms.size).toBe(24)
    expect(fragmentShaderOf({ components: [{ type: 'Aurora' }] })).toBeNull()
    expect(
      fragmentShaderOf({
        components: [
          {
            type: 'OpenPenFragmentShader',
            props: { ...shader, uniforms: { size: Infinity } }
          }
        ]
      })
    ).toBeNull()
  })
})
