import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument, writePenFile } from '@open-pencil/pen'

import { parseDocument } from '../helpers/document'

for (const [type, shadowType] of [
  ['shadow', 'outer'],
  ['shadow', 'inner'],
  ['blur', undefined],
  ['background_blur', undefined]
] as const) {
  test(`roundtrips ${type}/${shadowType ?? ''} blending without losing effect settings`, () => {
    for (const blendMode of ['multiply', 'screen']) {
      const graph = parseDocument([
        {
          id: 'r',
          type: 'rectangle',
          effect: {
            type,
            shadowType,
            color: '#33669940',
            offset: { x: 2, y: 4 },
            blur: 16,
            radius: 16,
            enabled: false,
            blendMode
          }
        }
      ])
      const before = graph.getNode('r')?.effects
      const document = writePenDocument(graph)
      expect(document.children?.[0].effect).toMatchObject([{ blendMode }])
      expect(parsePenFile(writePenFile(graph)).getNode('r')?.effects).toEqual(before)
    }
  })
}

test('unsupported pass-through effect blending still refuses a lossy save', () => {
  const graph = parseDocument([{ id: 'r', type: 'rectangle', effect: { type: 'shadow', blur: 4 } }])
  const node = graph.getNode('r')
  if (!node) throw new Error('Missing effect layer')
  graph.updateNode('r', {
    effects: node.effects.map((effect) => ({ ...effect, blendMode: 'PASS_THROUGH' }))
  })
  expect(() => writePenDocument(graph)).toThrow('Effect blend mode PASS_THROUGH is not supported')
})
