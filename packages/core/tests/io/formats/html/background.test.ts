import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { colorToFill } from '@open-pencil/scene-graph/color'

import { renderNodesToHTML } from '#core/io/formats/html'

for (const style of ['inline', 'tailwind'] as const) {
  test(`standalone ${style} uses the first visible opaque frame fill for the page`, async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('Missing page')
    const blue = colorToFill('#123456')
    const pale = colorToFill('#ABCDEF')
    const cases = [
      { type: 'FRAME', fills: [blue], opacity: 1, expected: true },
      { type: 'FRAME', fills: [blue], opacity: 0.5, expected: true },
      { type: 'FRAME', fills: [], opacity: 1, expected: false },
      { type: 'RECTANGLE', fills: [blue], opacity: 1, expected: false },
      { type: 'FRAME', fills: [colorToFill('#12345680')], opacity: 1, expected: false },
      { type: 'FRAME', fills: [blue, pale], opacity: 1, expected: true },
      { type: 'FRAME', fills: [{ ...pale, visible: false }, blue], opacity: 1, expected: true },
      { type: 'FRAME', fills: [colorToFill('#12345680'), pale], opacity: 1, expected: false }
    ] as const
    const ids: string[] = []
    for (const { type, fills, opacity, expected } of cases) {
      const frame = graph.createNode(type, page.id, {
        width: 160,
        height: 100,
        fills: [...fills],
        opacity
      })
      ids.push(frame.id)
      const { html } = await renderNodesToHTML(graph, [frame.id], { html: 'standalone', style })
      expect(html.includes('body{background:#123456}')).toBe(expected)
      expect(
        (await renderNodesToHTML(graph, [frame.id], { html: 'fragment', style })).html
      ).not.toContain('body{')
    }
    expect((await renderNodesToHTML(graph, ids, { html: 'standalone', style })).html).not.toContain(
      'body{background:#123456}'
    )
  })
}
