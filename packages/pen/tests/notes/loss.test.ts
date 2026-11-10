import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument } from '@open-pencil/pen'
import { colorToFill } from '@open-pencil/scene-graph/color'
import { OPEN_PENCIL_PLUGIN_DATA, withPluginData } from '@open-pencil/scene-graph/plugin-data'

function fixture(content = 'Keep this') {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.22',
      variables: { dimension: { type: 'number', value: 300 } },
      children: [
        {
          id: 'stack',
          type: 'frame',
          layout: 'horizontal',
          width: 600,
          height: 500,
          children: [{ id: 'note', type: 'note', content, width: 250, height: 219 }]
        }
      ]
    })
  )
  const note = graph.getNode('note')
  const body = graph.getChildren('note')[0]
  if (!note || !body) throw new Error('Missing fixture Note')
  return { graph, note, body }
}

test('custom Note body paints are refused before returning lossy output', () => {
  const { graph, body } = fixture()
  graph.updateNode(body.id, { fills: [colorToFill('#FF0000')] })
  expect(() => writePenDocument(graph)).toThrow(/body paints/)
  expect(body.fills[0].color.r).toBe(1)
})

test('unqualified Hug dimensions and width bindings are explicit export errors', () => {
  const { graph, note } = fixture()
  graph.updateNode(note.id, {
    pluginData: withPluginData(note.pluginData, OPEN_PENCIL_PLUGIN_DATA.note, {
      width: 'fit_content'
    })
  })
  expect(() => writePenDocument(graph)).toThrow(/Note dimensions/)
  graph.updateNode(note.id, {
    pluginData: withPluginData(note.pluginData, OPEN_PENCIL_PLUGIN_DATA.note, {
      width: 250,
      height: 219
    })
  })
  const variable = [...graph.variables.values()][0]
  graph.updateNode(note.id, { boundVariables: { width: variable.id } })
  expect(() => writePenDocument(graph)).toThrow(/Note dimensions/)
})

test.each([
  { changes: { layoutGrow: 1 }, dimension: 'width' as const, expected: 'fill_container(250)' },
  {
    changes: { layoutAlignSelf: 'STRETCH' as const },
    dimension: 'height' as const,
    expected: 'fill_container(219)'
  }
])(
  'Fill Note sizing does not silently become fixed on save: %j',
  ({ changes, dimension, expected }) => {
    const { graph, note } = fixture()
    graph.updateNode(note.id, changes)
    expect(writePenDocument(graph).children[0].children?.[0][dimension]).toBe(expected)
  }
)

test('a literal dollar sign remains literal Note text through save and reopen', () => {
  const { graph } = fixture('$')
  const reopened = parsePenFile(JSON.stringify(writePenDocument(graph)))
  expect(reopened.getChildren('note')[0].text).toBe('$')
})

test.each([
  {},
  { shade: { type: 'number', value: 4 } },
  { shade: { type: 'color', value: '$missing' } }
])('invalid Note color variables fail before graph construction: %j', (variables) => {
  expect(() =>
    parsePenFile(
      JSON.stringify({
        version: '2.22',
        variables,
        children: [{ id: 'note', type: 'note', content: 'Keep this', color: '$shade' }]
      })
    )
  ).toThrow(/valid color variables/)
})

test('color aliases and alpha survive Note save and reopen', () => {
  const graph = parsePenFile(
    JSON.stringify({
      version: '2.22',
      variables: {
        shade: { type: 'color', value: '$base' },
        base: { type: 'color', value: '#C9B8F280' }
      },
      children: [{ id: 'note', type: 'note', content: 'Keep this', color: '$shade' }]
    })
  )
  const output = writePenDocument(graph)
  expect(output.children[0].color).toBe('$shade')
  expect(output.variables?.shade.value).toBe('$base')
  const reopened = parsePenFile(JSON.stringify(output))
  expect(reopened.getNode('note')?.fills).toEqual(graph.getNode('note')?.fills)
})

test('unknown Note metadata is an error rather than silently stripped', () => {
  const { graph, note } = fixture()
  graph.updateNode(note.id, {
    pluginData: note.pluginData.map((entry) => ({
      ...entry,
      value: JSON.stringify({ width: 250, height: 219, futureSetting: 'Keep me' })
    }))
  })
  expect(() => writePenDocument(graph)).toThrow(/Invalid Note metadata/)
})

test.each([
  { a: { type: 'color', value: '$a' } },
  { a: { type: 'color', value: '$b' }, b: { type: 'color', value: '$a' } }
])(
  'cyclic Note color aliases are refused before creating fallback-colored layers: %j',
  (variables) => {
    expect(() =>
      parsePenFile(
        JSON.stringify({
          version: '2.22',
          variables,
          children: [{ id: 'note', type: 'note', color: '$a' }]
        })
      )
    ).toThrow(/valid color variables/)
  }
)

test('overflowed Note dimensions are rejected before authored metadata becomes invalid', () => {
  expect(() =>
    parsePenFile(
      '{"version":"2.22","children":[{"id":"note","type":"note","width":1e400,"height":219}]}'
    )
  ).toThrow(/finite/)
})

test('newly authored component Notes retain their text through save and reopen', () => {
  const { graph, note } = fixture()
  const component = graph.createNode('COMPONENT', graph.getPages()[0].id)
  graph.reparentNode(note.id, component.id)
  const reopened = parsePenFile(JSON.stringify(writePenDocument(graph)))
  expect(reopened.getNode(component.id)?.type).toBe('COMPONENT')
  expect(reopened.getChildren(note.id)[0].text).toBe('Keep this')
})
