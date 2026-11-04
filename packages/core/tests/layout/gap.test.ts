import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

import { computeLayout } from '#core/layout'

test.each(['VERTICAL', 'HORIZONTAL'] as const)(
  'Pen Space Around replaces the retained main-axis gap in a %s frame',
  (layoutMode) => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Layout page unavailable')
    const vertical = layoutMode === 'VERTICAL'
    const frame = graph.createNode('FRAME', page.id, {
      layoutMode,
      width: vertical ? 160 : 100,
      height: vertical ? 100 : 160,
      itemSpacing: 12.5,
      paddingTop: 12,
      paddingRight: 12,
      paddingBottom: 12,
      paddingLeft: 12,
      pluginData: withPluginData([], OPEN_PENCIL_PLUGIN_DATA.mainAxisDistribution, 'SPACE_AROUND')
    })
    const children = [0, 1].map(() =>
      graph.createNode('RECTANGLE', frame.id, {
        width: vertical ? 40 : 20,
        height: vertical ? 20 : 40
      })
    )
    computeLayout(graph, frame.id)
    // Actual Pen 1.2.21: a 160×100 column, padding12/gap12.5, has child Y21 and Y59.
    expect(children.map((n) => (vertical ? [n.x, n.y] : [n.y, n.x]))).toEqual([
      [12, 21],
      [12, 59]
    ])
    expect(frame.itemSpacing).toBe(12.5)
  }
)
