import type { LayoutAlign, LayoutCounterAlign } from '@open-pencil/scene-graph'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

import type { LayoutActionsContext } from './context'
export function createAlignmentActions({ node, preview }: LayoutActionsContext) {
  function setAlignment(
    primary: LayoutAlign,
    counter: LayoutCounterAlign,
    preserveDistribution = false
  ) {
    if (!node.value) return
    const n = node.value
    preview.update(
      [n.id],
      {
        primaryAxisAlign: preserveDistribution ? n.primaryAxisAlign : primary,
        counterAxisAlign: counter,
        pluginData: preserveDistribution
          ? n.pluginData
          : withPluginData(n.pluginData, OPEN_PENCIL_PLUGIN_DATA.mainAxisDistribution, undefined)
      },
      'Change alignment'
    )
    preview.commit()
  }

  function setGapAuto(enabled: boolean) {
    setGapDistribution(enabled ? 'SPACE_BETWEEN' : 'FIXED')
  }

  function setGapDistribution(mode: 'FIXED' | 'SPACE_BETWEEN' | 'SPACE_AROUND') {
    const n = node.value
    if (!n) return
    preview.update(
      [n.id],
      {
        primaryAxisAlign: mode === 'SPACE_BETWEEN' ? 'SPACE_BETWEEN' : 'MIN',
        pluginData: withPluginData(
          n.pluginData,
          OPEN_PENCIL_PLUGIN_DATA.mainAxisDistribution,
          mode === 'SPACE_AROUND' ? 'SPACE_AROUND' : undefined
        )
      },
      'Set gap distribution'
    )
    preview.commit()
  }
  return { setAlignment, setGapAuto, setGapDistribution }
}
