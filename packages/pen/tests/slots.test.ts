import { describe, expect, test } from 'bun:test'

import {
  parsePenFile,
  writePenDocument,
  writePenFile,
  PenExportError,
  PenImportError,
  type PenNode
} from '@open-pencil/pen'
import type { SceneGraph, SceneNode, SlotSettings } from '@open-pencil/scene-graph'
import { instanceMainComponent, syncInstance } from '@open-pencil/scene-graph/instances'
import {
  claimSlotContent,
  ownsSlotContent,
  slotPropertyId,
  slotScope
} from '@open-pencil/scene-graph/slots'

const row: PenNode = {
  id: 'row',
  type: 'frame',
  reusable: true,
  name: 'Row',
  width: 80,
  height: 20,
  children: [
    {
      id: 'label',
      type: 'text',
      content: 'Default',
      width: 60,
      height: 20,
      textGrowth: 'fixed-width-height'
    }
  ]
}
const card: PenNode = {
  id: 'card',
  type: 'frame',
  reusable: true,
  name: 'Card',
  width: 200,
  height: 140,
  children: [
    { id: 'content', type: 'frame', name: 'Content', width: 180, height: 100, slot: ['row'] }
  ]
}
function read(children: PenNode[]) {
  return parsePenFile(JSON.stringify({ version: '2.21', children }))
}
function node(graph: SceneGraph, id: string): SceneNode {
  const result = graph.getNode(id)
  if (!result) throw new Error(`Missing ${id}`)
  return result
}
function slot(graph: SceneGraph, instance: string): SceneNode {
  const result = graph.getChildren(instance).find((entry) => slotPropertyId(entry))
  if (!result) throw new Error(`Missing slot in ${instance}`)
  return result
}
function fixture() {
  return read([
    row,
    card,
    {
      id: 'one',
      type: 'ref',
      ref: 'card',
      descendants: {
        content: {
          children: [
            { id: 'own-row', type: 'ref', ref: 'row' },
            { id: 'own-box', type: 'rectangle', width: 30, height: 20, name: 'Own box' }
          ]
        }
      }
    },
    { id: 'two', type: 'ref', ref: 'card', descendants: { content: { children: [] } } },
    { id: 'three', type: 'ref', ref: 'card' }
  ])
}

describe('.pen slots bridge', () => {
  test('imports suggestions as guidance and keeps linked instances with independent ownership', () => {
    const graph = fixture()
    const property = node(graph, 'card').componentPropertyDefinitions[0]
    expect(property).toMatchObject({
      type: 'SLOT',
      preferredValues: ['row'],
      slotSettings: { allowPreferredValuesOnly: false }
    })
    for (const id of ['one', 'two', 'three'])
      expect(node(graph, id)).toMatchObject({ type: 'INSTANCE', componentId: 'card' })
    expect(ownsSlotContent(graph, slot(graph, 'one'))).toBe(true)
    expect(ownsSlotContent(graph, slot(graph, 'two'))).toBe(true)
    expect(ownsSlotContent(graph, slot(graph, 'three'))).toBe(false)
    expect(graph.getChildren(slot(graph, 'one').id).map((entry) => entry.id)).toEqual([
      'own-row',
      'own-box'
    ])
    expect(node(graph, 'own-row')).toMatchObject({ type: 'INSTANCE', componentId: 'row' })
  })

  test('edit, component sync, write and reopen preserve content, order, links and empty ownership', () => {
    const graph = fixture()
    graph.updateNode('own-box', { name: 'Edited only here' })
    graph.updateNode('content', { cornerRadius: 12 })
    graph.syncInstances('card')
    graph.updateNode('label', { text: 'Updated linked label' })
    syncInstance(graph, 'own-row')
    expect(graph.getChildren('own-row')[0].text).toBe('Updated linked label')
    expect(slot(graph, 'one').cornerRadius).toBe(12)
    expect(slot(graph, 'two').childIds).toEqual([])
    const output = writePenDocument(graph)
    expect(output.children.find((entry) => entry.id === 'card')?.children?.[0].slot).toEqual([
      'row'
    ])
    expect(
      output.children.find((entry) => entry.id === 'two')?.descendants?.content.children
    ).toEqual([])
    expect(
      output.children.find((entry) => entry.id === 'three')?.descendants?.content?.children
    ).toBeUndefined()
    const reopened = parsePenFile(writePenFile(graph))
    expect(node(reopened, 'one').type).toBe('INSTANCE')
    expect(node(reopened, 'own-box').name).toBe('Edited only here')
    expect(ownsSlotContent(reopened, slot(reopened, 'two'))).toBe(true)
    expect(ownsSlotContent(reopened, slot(reopened, 'three'))).toBe(false)
    reopened.updateNode('content', { cornerRadius: 19 })
    reopened.syncInstances('card')
    expect(slot(reopened, 'one').cornerRadius).toBe(19)
    expect(graph.getChildren(slot(graph, 'one').id).map((entry) => entry.id)).toEqual([
      'own-row',
      'own-box'
    ])
    expect(node(reopened, 'own-row').componentId).toBe('row')
  })

  test('editor slot ownership accepts non-suggested layers and survives another save', () => {
    const graph = fixture()
    const frame = slot(graph, 'three')
    const scope = slotScope(graph, frame.id)
    if (scope.kind !== 'slot') throw new Error('Expected editable instance slot')
    claimSlotContent(graph, scope)
    const added = graph.createNode('ELLIPSE', frame.id, { name: 'Not a suggested component' })
    const reopened = parsePenFile(writePenFile(graph))
    expect(node(reopened, added.id).type).toBe('ELLIPSE')
    expect(slot(reopened, 'two').childIds).toEqual([])
  })

  test('nested instance slot paths retain both component links', () => {
    const graph = read([
      row,
      card,
      {
        id: 'outer',
        type: 'frame',
        reusable: true,
        children: [{ id: 'nested', type: 'ref', ref: 'card' }]
      },
      {
        id: 'outer-copy',
        type: 'ref',
        ref: 'outer',
        descendants: {
          'nested/content': { children: [{ id: 'nested-row', type: 'ref', ref: 'row' }] }
        }
      }
    ])
    const output = writePenDocument(graph)
    expect(output.children.at(-1)?.descendants?.['nested/content'].children?.[0].type).toBe('ref')
    const reopened = parsePenFile(writePenFile(graph))
    const nested = reopened.getChildren('outer-copy')[0]
    expect(node(reopened, 'outer-copy').type).toBe('INSTANCE')
    expect(nested.type).toBe('INSTANCE')
    expect(instanceMainComponent(reopened, nested)?.id).toBe('card')
    expect(ownsSlotContent(reopened, slot(reopened, nested.id))).toBe(true)
    expect(node(reopened, 'nested-row').componentId).toBe('row')
  })

  test('keeps populated slots of a nested component instance inside a reusable parent', () => {
    const graph = read([
      row,
      card,
      {
        id: 'outer',
        type: 'frame',
        reusable: true,
        children: [
          {
            id: 'nested',
            type: 'ref',
            ref: 'card',
            descendants: {
              content: {
                children: [
                  {
                    id: 'nested-default',
                    type: 'rectangle',
                    name: 'Nested content',
                    width: 40,
                    height: 30
                  },
                  { id: 'nested-default-row', type: 'ref', ref: 'row' }
                ]
              }
            }
          }
        ]
      },
      { id: 'outer-copy', type: 'ref', ref: 'outer' }
    ])
    const copy = graph.getChildren(slot(graph, graph.getChildren('outer-copy')[0].id).id)[0]
    graph.updateNode(copy.id, { name: 'Changed nested content' })
    const reopened = parsePenFile(writePenFile(graph))
    const nested = reopened.getChildren('outer-copy')[0]
    expect(instanceMainComponent(reopened, nested)?.id).toBe('card')
    expect(reopened.getChildren(slot(reopened, nested.id).id)[0].name).toBe(
      'Changed nested content'
    )
    expect(node(reopened, 'nested-default').name).toBe('Nested content')
    const nestedRow = reopened.getChildren(slot(reopened, nested.id).id)[1]
    expect(instanceMainComponent(reopened, nestedRow)?.id).toBe('row')
  })

  test('preserves multiple same-named slots and refuses orphan slot metadata', () => {
    const graph = read([
      {
        id: 'multi',
        type: 'frame',
        reusable: true,
        children: [
          { id: 'first', type: 'frame', name: 'Content', slot: [] },
          { id: 'second', type: 'frame', name: 'Content', slot: [] }
        ]
      }
    ])
    expect(
      parsePenFile(writePenFile(graph))
        .getNode('multi')
        ?.componentPropertyDefinitions.map((entry) => entry.name)
    ).toEqual(['Content', 'Content 2'])
    graph.updateNode('first', { componentPropertyReferences: [] })
    expect(() => writePenFile(graph)).toThrow(PenExportError)
  })

  test('rejects changed slot bindings, unknown assignments and missing descendant targets', () => {
    const graph = fixture()
    const first = slot(graph, 'one')
    const copiedProperty = first.componentPropertyReferences[0]
    const rogue = graph.createNode('FRAME', 'one', {
      componentPropertyReferences: [copiedProperty]
    })
    expect(() => writePenFile(graph)).toThrow(PenExportError)
    graph.deleteNode(rogue.id)
    graph.updateNode('one', { componentPropertyAssignments: { unknown: '' } })
    expect(() => writePenFile(graph)).toThrow(PenExportError)
    expect(() =>
      read([
        row,
        card,
        { id: 'bad', type: 'ref', ref: 'card', descendants: { missing: { children: [] } } }
      ])
    ).toThrow(PenImportError)
  })

  test('refuses unrepresentable slot property metadata and embedded component definitions', () => {
    const graph = fixture()
    const owner = node(graph, 'card')
    const definition = owner.componentPropertyDefinitions[0]
    for (const patch of [
      { description: 'Keep this guidance' },
      { name: 'Independent property name' },
      { defaultValue: 'custom' }
    ]) {
      graph.updateNode(owner.id, { componentPropertyDefinitions: [{ ...definition, ...patch }] })
      expect(() => writePenFile(graph)).toThrow(PenExportError)
    }
    graph.updateNode(owner.id, { componentPropertyDefinitions: [definition] })
    graph.createNode('COMPONENT', slot(graph, 'one').id, { name: 'Definition instead of instance' })
    expect(() => writePenFile(graph)).toThrow(PenExportError)
  })

  test.each([
    { minChildren: 1 },
    { maxChildren: 2 },
    { allowPreferredValuesOnly: true },
    { displayEmptyByDefault: true },
    { stretchChildOnInsert: true }
  ] satisfies Partial<SlotSettings>[])(
    'refuses unrepresentable native slot settings %j',
    (patch) => {
      const graph = fixture()
      const definition = node(graph, 'card').componentPropertyDefinitions[0]
      graph.updateNode('card', {
        componentPropertyDefinitions: [
          {
            ...definition,
            slotSettings: {
              allowPreferredValuesOnly: false,
              displayEmptyByDefault: false,
              stretchChildOnInsert: false,
              ...patch
            }
          }
        ]
      })
      expect(() => writePenFile(graph)).toThrow(PenExportError)
    }
  )

  test('refuses malformed slot ownership, suggestions, and populated origins before conversion', () => {
    for (const children of [
      [{ id: 'outside', type: 'frame', slot: [] }],
      [{ ...card, children: [{ id: 'bad', type: 'rectangle', slot: [] }] }],
      [{ ...card, children: [{ id: 'bad', type: 'frame', slot: ['missing'] }] }],
      [
        {
          ...card,
          children: [
            { id: 'bad', type: 'frame', slot: [], children: [{ id: 'default', type: 'rectangle' }] }
          ]
        }
      ]
    ] satisfies PenNode[][])
      expect(() => read(children)).toThrow(PenImportError)
  })
})
