import type { SceneNode } from '@open-pencil/scene-graph'
import { textLengthPixels } from '@open-pencil/scene-graph/text'

import type { PenNode } from '../schema'

const TEXT_GROWTH = {
  WIDTH_AND_HEIGHT: 'auto',
  HEIGHT: 'fixed-width',
  NONE: 'fixed-width-height',
  TRUNCATE: 'fixed-width-height'
} as const

export function writeText(node: SceneNode, result: PenNode) {
  if (node.type === 'TEXT') {
    Object.assign(result, {
      content: node.text,
      fontFamily: node.fontFamily,
      fontSize: node.fontSize,
      fontWeight: String(node.fontWeight),
      fontStyle: node.italic ? 'italic' : 'normal',
      textAlign:
        node.textAlignHorizontal === 'JUSTIFIED'
          ? 'justify'
          : node.textAlignHorizontal.toLowerCase(),
      textAlignVertical:
        node.textAlignVertical === 'CENTER' ? 'middle' : node.textAlignVertical.toLowerCase(),
      textGrowth: TEXT_GROWTH[node.textAutoResize],
      letterSpacing: textLengthPixels(node.letterSpacing, node.fontSize)
    })
    if (node.lineHeight)
      result.lineHeight = textLengthPixels(node.lineHeight, node.fontSize) / node.fontSize
  }
}
