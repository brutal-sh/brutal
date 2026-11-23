import { decode } from 'ufo'

import type { Fill, Variable } from '@open-pencil/scene-graph'
import { colorToHexRaw } from '@open-pencil/scene-graph/color'
import { fragmentShaderOf, type ShaderPaint } from '@open-pencil/scene-graph/shaders'
import { shaderEffectLabel } from '@open-pencil/vue/controls/shader'

export function fillLabel(
  fill: Fill,
  boundVariable?: Variable,
  shader?: ShaderPaint | null
): string {
  if (boundVariable) return boundVariable.name
  const fragment = shader ? fragmentShaderOf(shader.preset) : null
  if (fragment) return decode(fragment.url.split('/').at(-1) || 'Shader')
  // A shader is named by its effects, top first, as its picker lists them.
  if (shader)
    return shader.preset.components
      .map((component) => shaderEffectLabel(component.type))
      .reverse()
      .join(', ')
  if (fill.type === 'SOLID') return colorToHexRaw(fill.color)
  if (fill.type === 'GRADIENT_MESH') return 'Mesh'
  if (fill.type.startsWith('GRADIENT')) return fill.type.replace('GRADIENT_', '')
  return fill.type
}
