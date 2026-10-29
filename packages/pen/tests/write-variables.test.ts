import { describe, expect, test } from 'bun:test'

import { parsePenFile, writePenFile, writePenDocument } from '@open-pencil/pen'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { parseDocument } from './helpers/document'

function variable(graph: SceneGraph, name: string) {
  const found = [...graph.variables.values()].find((entry) => entry.name === name)
  if (!found) throw new Error(`Missing variable ${name}`)
  return found
}

describe('.pen variable export', () => {
  test('keeps scalar values, alias links, node bindings and per-node theme overrides', () => {
    const graph = parseDocument(
      [
        {
          id: 'light',
          type: 'frame',
          layout: 'horizontal',
          width: '$size',
          gap: '$gap',
          padding: '$gap',
          cornerRadius: '$gap',
          fill: '$ink',
          children: [
            {
              id: 'text',
              type: 'text',
              content: 'Themed',
              fontFamily: '$font',
              fontSize: '$gap',
              enabled: '$show'
            }
          ]
        },
        {
          id: 'dark',
          type: 'frame',
          theme: { Mode: 'Dark' },
          width: '$size',
          fill: '$alias',
          opacity: '$alpha'
        }
      ],
      {
        themes: { Mode: ['Light', 'Dark'] },
        variables: {
          ink: {
            type: 'color',
            value: [
              { value: '#001122', theme: { Mode: 'Light' } },
              { value: '#FFEEDD', theme: { Mode: 'Dark' } }
            ]
          },
          alias: { type: 'color', value: '$ink' },
          size: { type: 'number', value: 200 },
          gap: { type: 'number', value: 12 },
          font: { type: 'string', value: 'Inter' },
          show: { type: 'boolean', value: true },
          alpha: { type: 'number', value: 0.8 }
        }
      }
    )
    const written = writePenDocument(graph)
    expect(written.variables?.alias).toMatchObject({ type: 'color' })
    expect(written.children[0].width).toBe('$size')
    expect(written.children[0].fill).toEqual([
      { type: 'color', enabled: true, color: '$ink', blendMode: undefined }
    ])
    expect(written.children[1].theme).toEqual({ Mode: 'Dark' })
    const read = parsePenFile(writePenFile(graph))
    for (const id of ['light', 'dark', 'text']) {
      expect(read.getNode(id)?.fills).toEqual(graph.getNode(id)?.fills)
      expect(read.getNode(id)?.width).toEqual(graph.getNode(id)?.width)
      expect(Object.keys(read.getNode(id)?.boundVariables ?? {})).toEqual(
        Object.keys(graph.getNode(id)?.boundVariables ?? {})
      )
    }
    const alias = variable(read, 'alias')
    const ink = variable(read, 'ink')
    expect(
      Object.values(alias.valuesByMode).every(
        (value) => typeof value === 'object' && 'aliasId' in value && value.aliasId === ink.id
      )
    ).toBe(true)
  })

  test('preserves the active mode as explicit themes on exported roots', () => {
    const graph = parseDocument([{ id: 'r', type: 'rectangle', fill: '$color' }], {
      themes: { Mode: ['Light', 'Dark'] },
      variables: {
        color: {
          type: 'color',
          value: [
            { value: '#FFFFFF', theme: { Mode: 'Light' } },
            { value: '#000000', theme: { Mode: 'Dark' } }
          ]
        }
      }
    })
    const collection = [...graph.variableCollections.values()][0]
    const dark = collection.modes.find((mode) => mode.name === 'Dark')
    if (!dark) throw new Error('Missing mode')
    graph.activeMode.set(collection.id, dark.modeId)
    const read = parsePenFile(writePenFile(graph))
    expect(read.getNode('r')?.fills[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 })
  })

  test('rejects unsupported bindings instead of substituting their current value', () => {
    const graph = parseDocument([{ id: 'r', type: 'rectangle' }], {
      variables: { number: { type: 'number', value: 20 } }
    })
    graph.updateNode('r', { boundVariables: { rotation: variable(graph, 'number').id } })
    expect(() => writePenFile(graph)).toThrow('Binding rotation is not supported')
  })
})

test('refuses native literal strings that .pen would reinterpret as variable references', () => {
  const graph = parseDocument([], { variables: { label: { type: 'string', value: 'Literal' } } })
  const label = variable(graph, 'label')
  for (const mode of Object.keys(label.valuesByMode)) label.valuesByMode[mode] = '$literal'
  expect(() => writePenFile(graph)).toThrow('Literal strings beginning with $')
  for (const mode of Object.keys(label.valuesByMode)) label.valuesByMode[mode] = '$'
  expect(writePenDocument(graph).variables?.label.value).toBe('$')
})

test('refuses independent opacity on a bound color while ordinary alpha-bound paints roundtrip', () => {
  const graph = parseDocument([{ id: 'r', type: 'rectangle', fill: '$color' }], {
    variables: { color: { type: 'color', value: '#AA228880' } }
  })
  const node = graph.getNode('r')
  if (!node) throw new Error('Missing rectangle')
  expect(parsePenFile(writePenFile(graph)).getNode('r')?.fills[0].opacity).toBeCloseTo(128 / 255, 8)
  node.fills[0].opacity = 0.25
  expect(() => writePenFile(graph)).toThrow('Bound color with independent paint opacity')
  expect(node.fills[0].opacity).toBe(0.25)
})
