import type { SceneNode } from '@open-pencil/scene-graph'
import { colorToHex8 } from '@open-pencil/scene-graph/color'

import { penBlendMode } from '../paints'
import type { PenEffect } from '../schema'

export function writeEffects(
  node: SceneNode,
  path: string,
  add: (node: SceneNode, path: string, message: string) => unknown
): PenEffect[] {
  return node.effects.flatMap<PenEffect>((effect, index) => {
    const at = `${path}/${index}`
    if (effect.spread !== 0)
      add(node, `${at}/spread`, 'Shadow spread is not supported by .pen 2.21.')
    const blendMode = effect.blendMode ? penBlendMode(effect.blendMode) : undefined
    if (effect.blendMode && !blendMode)
      add(node, `${at}/blendMode`, `Effect blend mode ${effect.blendMode} is not supported.`)
    if (effect.showShadowBehindNode === false)
      add(node, `${at}/showShadowBehindNode`, 'Hidden shadows behind nodes are not supported.')
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
      return [
        {
          type: 'shadow',
          shadowType: effect.type === 'INNER_SHADOW' ? 'inner' : 'outer',
          color: colorToHex8(effect.color),
          offset: { ...effect.offset },
          blur: effect.radius,
          blendMode,
          enabled: effect.visible
        }
      ]
    if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR')
      return [
        {
          type: effect.type === 'LAYER_BLUR' ? 'blur' : 'background_blur',
          radius: effect.radius,
          blendMode,
          enabled: effect.visible
        }
      ]
    add(node, at, `${effect.type} effects are not supported.`)
    return []
  })
}
