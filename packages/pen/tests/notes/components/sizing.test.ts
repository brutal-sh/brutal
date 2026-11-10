import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument, type PenDocument, type PenNode } from '@open-pencil/pen'
import { noteOfNode } from '@open-pencil/scene-graph/generated'

const dimensions = { width: 'fill_container(300)', height: 'fill_container(400)' }

for (const replacement of [false, true]) {
  test(`nested Note Fill overrides survive three saves with typed replacement ${replacement}`, () => {
    const target: PenNode = replacement
      ? { id: 'target', type: 'rectangle' }
      : { id: 'target', type: 'note', content: 'Keep this', width: 250, height: 219 }
    const override = replacement
      ? { type: 'ref' as const, ref: 'noteMaster', ...dimensions }
      : dimensions
    let document: PenDocument = {
      version: '2.22',
      children: [
        {
          id: 'noteMaster',
          type: 'note',
          reusable: true,
          content: 'Keep this',
          width: 250,
          height: 219
        },
        {
          id: 'frame',
          type: 'frame',
          reusable: true,
          layout: 'none',
          width: 600,
          height: 500,
          children: [target]
        },
        {
          id: 'instance',
          type: 'ref',
          ref: 'frame',
          descendants: {
            target: override
          }
        }
      ]
    }
    for (let round = 0; round < 3; round++) {
      const graph = parsePenFile(JSON.stringify(document))
      const copy = graph.getChildren('instance')[0]
      expect(noteOfNode(copy)).toEqual(dimensions)
      expect(graph.getChildren(copy.id)[0].text).toBe('Keep this')
      document = writePenDocument(graph)
      const outer = document.children[2]
      // Typed replacements already materialize their enclosing instance.
      expect(outer.type).toBe(replacement ? 'frame' : 'ref')
      expect(replacement ? outer.children?.[0] : outer.descendants?.target).toMatchObject(
        dimensions
      )
      expect(document.children[0]).toMatchObject({ width: 250, height: 219 })
    }
  })
}
