import { expect, spyOn, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { IORegistry, penFormat } from '@open-pencil/core/io'
import { installTextMeasurer } from '@open-pencil/core/layout'

import { fontManager } from '#core/text/fonts'

test.each(['2.21', '2.22'])(
  'measures authored %s text after its font becomes ready on the first import',
  async (version) => {
    const data = expectDefined(await fontManager.fetchBundledFont('/InterVariable.ttf'))
    const uninstall = installTextMeasurer(() => ({ width: 84, height: 30 }))
    const loading = spyOn(fontManager, 'loadFont').mockImplementation(
      async (family, style = 'Regular') => {
        await fontManager.markLoaded(family, style, data)
        return data
      }
    )
    try {
      const { graph } = await new IORegistry([penFormat]).readDocument({
        name: 'cold-text.pen',
        data: new TextEncoder().encode(
          JSON.stringify({
            version,
            children: [
              {
                id: 'label',
                type: 'text',
                content: 'SVG 1:1',
                fontFamily: `Cold import fixture ${version}`,
                fontWeight: '600',
                fontSize: 24,
                textGrowth: 'auto'
              }
            ]
          })
        )
      })
      expect(graph.getNode('label')).toMatchObject({ width: 85, height: 29 })
    } finally {
      loading.mockRestore()
      uninstall()
    }
  }
)
