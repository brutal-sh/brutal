import type { SceneNode } from '@open-pencil/scene-graph'
import { layoutJustification } from '@open-pencil/scene-graph/layout'

/** Distributed canvas spacing replaces the retained numeric main-axis gap. */
export function hasDistributedGap(
  node: Pick<SceneNode, 'primaryAxisAlign' | 'pluginData'>
): boolean {
  const alignment = layoutJustification(node)
  return alignment === 'SPACE_BETWEEN' || alignment === 'SPACE_AROUND'
}
