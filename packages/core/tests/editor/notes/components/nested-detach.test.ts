import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import { noteBody } from '@open-pencil/scene-graph/generated'

test('deep Note component detachment retains explicit equal claims after reopen and prototype edits', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.22',
      children: [
        {
          id: 'm',
          type: 'note',
          reusable: true,
          content: 'Master',
          width: 250,
          height: 219,
          color: '#FEE484'
        },
        {
          id: 'c',
          type: 'frame',
          reusable: true,
          layout: 'none',
          width: 600,
          height: 300,
          children: [
            { id: 'nr', type: 'ref', ref: 'm', content: 'Local', width: 280, color: '#DCC5F9' }
          ]
        },
        {
          id: 'd',
          type: 'frame',
          reusable: true,
          layout: 'none',
          width: 800,
          height: 400,
          children: [
            {
              id: 'cr',
              type: 'ref',
              ref: 'c',
              descendants: { nr: { content: 'Proto', width: 290, color: '#FFCC98' } }
            }
          ]
        },
        {
          id: 'out',
          type: 'ref',
          ref: 'd',
          descendants: { 'cr/nr': { content: 'Proto', width: 290, color: '#FFCC98' } }
        }
      ]
    })
  )
  const editor = createEditor({ graph })
  const before = writePenDocument(graph)
  editor.detachNoteComponent('m')
  const saved = writePenDocument(graph)
  const reopened = parsePenFile(JSON.stringify(saved))
  const prototype = reopened.getChildren('cr').at(0)
  const outerInner = reopened.getChildren('out').at(0)
  const copy = outerInner && reopened.getChildren(outerInner.id).at(0)
  const body = prototype && noteBody(reopened, prototype)
  if (!prototype || !copy || !body) throw new Error('Missing nested Notes')
  reopened.updateNode(prototype.id, { width: 340 })
  reopened.updateNode(body.id, { text: 'Later prototype' })
  reopened.syncInstances('d')
  expect(copy.width).toBe(290)
  expect(noteBody(reopened, copy)?.text).toBe('Proto')
  editor.undo.undo()
  expect(writePenDocument(graph)).toEqual(before)
  editor.undo.redo()
  expect(writePenDocument(graph)).toEqual(saved)
})
