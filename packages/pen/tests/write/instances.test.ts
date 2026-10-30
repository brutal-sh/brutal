import { describe, expect, test } from 'bun:test'

import { parsePenFile, writePenFile, writePenDocument, type PenNode } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'
import { syncInstance } from '@open-pencil/scene-graph/instances'

import { parseDocument } from '../helpers/document'

const component: PenNode = {
  id: 'button',
  type: 'frame',
  reusable: true,
  layout: 'none',
  width: 100,
  height: 40,
  fill: '#001122',
  children: [
    {
      id: 'label',
      type: 'text',
      content: 'Button',
      width: 80,
      height: 20,
      textGrowth: 'fixed-width-height',
      fontSize: 14
    },
    { id: 'dot', type: 'ellipse', x: 85, y: 5, width: 10, height: 10, fill: '#FFFFFF' }
  ]
}
function copy(graph: SceneGraph, source: string) {
  const node = graph.getChildren('instance').find((entry) => entry.componentId === source)
  if (!node) throw new Error(`Missing copy of ${source}`)
  return node
}

describe('.pen linked instance export', () => {
  test('preserves links, root overrides and descendant edits while unclaimed fields keep following', () => {
    const graph = parseDocument([
      component,
      {
        id: 'instance',
        type: 'ref',
        ref: 'button',
        x: 150,
        width: 140,
        descendants: { label: { content: 'Custom' } }
      }
    ])
    const output = writePenDocument(graph)
    expect(output.children[1]).toMatchObject({
      type: 'ref',
      ref: 'button',
      x: 150,
      width: 140,
      descendants: { label: { content: 'Custom' } }
    })
    expect(output.children[1].fill).toBeUndefined()
    const reopened = parsePenFile(writePenFile(graph))
    expect(reopened.getNode('instance')).toMatchObject({
      type: 'INSTANCE',
      componentId: 'button',
      x: 150,
      width: 140
    })
    expect(copy(reopened, 'label').text).toBe('Custom')
    reopened.updateNode('label', { text: 'New default', fontSize: 21 })
    reopened.updateNode('dot', { width: 13 })
    syncInstance(reopened, 'instance')
    expect(copy(reopened, 'label').text).toBe('Custom')
    expect(copy(reopened, 'label').fontSize).toBe(21)
    expect(copy(reopened, 'dot').width).toBe(13)
  })

  test('preserves explicitly equal overrides and leaves plain copies unclaimed', () => {
    const graph = parseDocument([
      component,
      { id: 'instance', type: 'ref', ref: 'button', descendants: { label: { content: 'Button' } } }
    ])
    const reopened = parsePenFile(writePenFile(graph))
    reopened.updateNode('label', { text: 'Changed default' })
    syncInstance(reopened, 'instance')
    expect(copy(reopened, 'label').text).toBe('Button')
    const plain = parseDocument([component, { id: 'instance', type: 'ref', ref: 'button' }])
    const plainRead = parsePenFile(writePenFile(plain))
    plainRead.updateNode('label', { text: 'Changed default' })
    syncInstance(plainRead, 'instance')
    expect(copy(plainRead, 'label').text).toBe('Changed default')
  })
})

test('nested descendant overrides retain their paths and component inheritance', () => {
  const wrapper: PenNode = {
    id: 'wrapper',
    type: 'frame',
    reusable: true,
    layout: 'none',
    children: [{ id: 'nested', type: 'ref', ref: 'button' }]
  }
  const graph = parseDocument([
    component,
    wrapper,
    {
      id: 'instance',
      type: 'ref',
      ref: 'wrapper',
      descendants: { 'nested/label': { content: 'Nested custom' } }
    }
  ])
  const output = writePenDocument(graph)
  expect(output.children[2].descendants?.['nested/label']).toMatchObject({
    content: 'Nested custom'
  })
  const read = parsePenFile(writePenFile(graph))
  const nested = read.getChildren('instance')[0]
  const label = read.getChildren(nested.id).find((node) => node.type === 'TEXT')
  if (!label) throw new Error('Missing nested label')
  expect(label.text).toBe('Nested custom')
  read.updateNode('label', { fontSize: 24, text: 'New base text' })
  syncInstance(read, 'nested')
  syncInstance(read, 'instance')
  expect(read.getNode(label.id)?.text).toBe('Nested custom')
  expect(read.getNode(label.id)?.fontSize).toBe(24)
})
