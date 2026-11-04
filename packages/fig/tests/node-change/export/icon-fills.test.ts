import { describe, expect, test } from 'bun:test'

import { forEachOverrideRecord } from '#fig/instance-overrides/types'
import { readNodeChangePluginData, sceneNodeToKiwi } from '#fig/node-change/index'

import type { NodeChange } from '@open-pencil/kiwi/fig/codec'
import { SceneGraph } from '@open-pencil/scene-graph'
import { withIcon, withIconPaintSource, withIconTint } from '@open-pencil/scene-graph/icons'
import { recordInstanceOverride } from '@open-pencil/scene-graph/instances'
import { OPEN_PENCIL_PLUGIN_DATA } from '@open-pencil/scene-graph/plugin-data'

describe('logical icon fill claims', () => {
  test.each(['paint', 'binding'] as const)(
    'keeps %s instance claims out of native frame fills',
    (kind) => {
      const graph = new SceneGraph()
      const page = graph.getPages()[0]
      const component = graph.createNode('COMPONENT', page.id)
      const white = {
        type: 'SOLID' as const,
        color: { r: 1, g: 1, b: 1, a: 1 },
        opacity: 1,
        visible: true
      }
      const icon = graph.createNodeWithId('2:20', 'FRAME', component.id, {
        name: 'Named Icon',
        width: 24,
        height: 24,
        fills: [white]
      })
      const path = graph.createNode('VECTOR', icon.id, { width: 24, height: 24, fills: [white] })
      graph.updateNode(path.id, { pluginData: withIconTint(path, ['fill']) })
      graph.updateNode(path.id, { pluginData: withIconPaintSource(path) })
      graph.updateNode(icon.id, {
        pluginData: withIcon(icon, { name: 'lucide:heart', paintSource: 'frame' })
      })
      const instance = graph.createInstance(component.id, page.id)
      if (!instance) throw new Error('Instance missing')
      const [copy] = graph.getChildren(instance.id)
      if (!copy) throw new Error('Copied icon missing')
      if (kind === 'paint') {
        graph.updateNode(copy.id, { fills: [{ ...white, color: { r: 1, g: 0, b: 0, a: 1 } }] })
        recordInstanceOverride(graph, copy.id, ['fills'])
      } else {
        const collection = graph.createCollection('Colors')
        const brand = graph.createVariable('Brand', 'COLOR', collection.id, {
          r: 1,
          g: 0,
          b: 0,
          a: 1
        })
        graph.bindVariable(copy.id, 'fills/0/color', brand.id)
      }
      const [record] = sceneNodeToKiwi(
        instance,
        { sessionID: 1, localID: 1 },
        0,
        { value: 100 },
        graph,
        [],
        {
          nodeIdToGuid: new Map([[icon.id, { sessionID: 2, localID: 20 }]])
        }
      )
      const claims: NodeChange[] = []
      forEachOverrideRecord(record, (node, override) => {
        if (override?.guidPath?.guids?.some((guid) => guid.sessionID === 2 && guid.localID === 20))
          claims.push(node)
      })
      expect(claims.length).toBeGreaterThan(0)
      for (const claim of claims) expect(claim.fillPaints ?? []).toEqual([])
      expect(
        claims.some(
          (claim) =>
            readNodeChangePluginData(claim, OPEN_PENCIL_PLUGIN_DATA.iconFills)?.length === 1
        )
      ).toBe(true)
    }
  )
})
