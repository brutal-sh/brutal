import * as v from 'valibot'

import {
  MAX_FRAGMENT_SOURCE_LENGTH,
  fragmentShaderSchema,
  type FragmentShader,
  type ShaderPreset,
  type ShaderUniformValue
} from './schema'

export const FRAGMENT_SHADER_COMPONENT = 'OpenPenFragmentShader'
/** GLSL uses the existing shader-preset/frame lifecycle, independently of the preset library. */
export function fragmentShaderPreset(shader: FragmentShader): ShaderPreset {
  const props = v.parse(fragmentShaderSchema, shader)
  if (props.error === undefined) delete props.error
  return {
    components: [
      {
        type: FRAGMENT_SHADER_COMPONENT,
        props
      }
    ]
  }
}

export function fragmentShaderOf(preset: ShaderPreset): FragmentShader | null {
  const component = preset.components.at(0)
  if (preset.components.length !== 1 || component?.type !== FRAGMENT_SHADER_COMPONENT) return null
  const result = v.safeParse(fragmentShaderSchema, component.props)
  return result.success ? result.output : null
}

export interface FragmentUniform {
  name: string
  type: string
  label: string
  size: number
  integer: boolean
  color: boolean
  automatic?: 'resolution' | 'time' | 'mouse' | 'sdf'
  min?: number
  max?: number
  value: ShaderUniformValue
}

function uniformDefault(
  type: string,
  size: number,
  color: boolean,
  raw: string
): ShaderUniformValue {
  const numeric = raw
    .split(/[\s,]+/)
    .filter((part) => part.length > 0)
    .map(Number)
  const numbers = numeric.length > 0 && numeric.every(Number.isFinite) ? numeric : []
  let value: ShaderUniformValue = numbers[0] ?? 0
  if (color) value = /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(raw) ? raw : '#000000'
  else if (type === 'sampler2D') value = raw.replace(/^['"]|['"]$/g, '')
  else if (type === 'bool') value = raw === 'true' || raw === '1'
  else if (size > 1) value = Array.from({ length: size }, (_, at) => numbers[at] ?? 0)
  return value
}

function annotatedUniform(type: string, name: string, comment: string): FragmentUniform {
  const annotations = new Map(
    Array.from(comment.matchAll(/@(\w+)([^@\r\n]*)/g), (entry) => [
      entry[1],
      entry[2].replace(/\s*\*\s*$/, '').trim()
    ])
  )
  const size = Number(type.match(/vec([234])/)?.[1] ?? 1)
  const integer = type === 'int' || type.startsWith('ivec')
  const color = annotations.has('color') && type.startsWith('vec') && size >= 3
  const raw = annotations.get('default') ?? ''
  const range = (annotations.get('range') ?? '').split(',').map(Number)
  const limit = (key: string, fallback?: number) => {
    const value = annotations.get(key)
    const parsed = value === undefined ? fallback : Number(value)
    return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined
  }
  const automatic = (['resolution', 'time', 'mouse', 'sdf'] as const).find((key) =>
    annotations.has(key)
  )
  return {
    name,
    type,
    label: annotations.get('label') || name,
    size,
    integer,
    color,
    automatic,
    min: limit('min', range.length === 2 ? range[0] : undefined),
    max: limit('max', range.length === 2 ? range[1] : undefined),
    value: uniformDefault(type, size, color, raw)
  }
}

/** Read the public block-comment annotations; compilation remains the GLSL driver's job. */
export function fragmentUniforms(source: string): FragmentUniform[] {
  if (source.length > MAX_FRAGMENT_SOURCE_LENGTH) throw new Error('Shader source is too large.')
  const declaration =
    /\/\*([\s\S]*?)\*\/|\/\/[^\n]*|\buniform\s+(?:(?:lowp|mediump|highp)\s+)?(float|int|bool|[ib]?vec[234]|sampler2D)\s+([A-Za-z_]\w*)\s*;/g
  const uniforms: FragmentUniform[] = []
  let comment = ''
  let end = 0
  for (const match of source.matchAll(declaration)) {
    if (source.slice(end, match.index).trim()) comment = ''
    end = match.index + match[0].length
    const block = match.at(1)
    if (block !== undefined) {
      comment = block
      continue
    }
    const [, , type, name] = match
    if (!type) {
      comment = ''
      continue
    }
    uniforms.push(annotatedUniform(type, name, comment))
    comment = ''
    if (uniforms.length > 256) throw new Error('Shader has too many uniforms.')
  }
  return uniforms
}
