import { expect, test } from 'bun:test'

import {
  buildPenGraph,
  parsePenDocument,
  parsePenFile,
  penAssets,
  writePenFile
} from '@open-pencil/pen'
import { fragmentShaderOf, readShaderPaints } from '@open-pencil/scene-graph/shaders'

import { getNodeOrThrow } from '../helpers/assert'

const source = 'precision mediump float; void main(){gl_FragColor=vec4(1.0);}'
const paint = {
  type: 'shader',
  url: 'checks.glsl',
  uniforms: { size: 24, ink: '#336699', offset: [0.25, 0.75] },
  opacity: 0.8,
  blendMode: 'multiply'
}
const document = {
  version: '2.21',
  children: [
    {
      id: 'shader',
      name: 'GLSL round trip',
      type: 'rectangle',
      width: 320,
      height: 240,
      fill: [paint, { ...paint, url: 'second.glsl' }],
      stroke: paint,
      strokeWidth: 8
    }
  ]
}

test('shader fills and strokes retain source, overrides and paint geometry across Pen saves', () => {
  const parsed = parsePenDocument(JSON.stringify(document))
  expect(penAssets(parsed).shaders).toEqual(['checks.glsl', 'second.glsl'])
  const graph = buildPenGraph(parsed, {
    shaders: new Map([
      ['checks.glsl', source],
      ['second.glsl', source]
    ])
  })
  const node = getNodeOrThrow(graph, 'shader')
  expect(node?.fills).toHaveLength(2)
  expect(node?.strokes[0]).toMatchObject({
    opacity: 0.8,
    blendMode: 'MULTIPLY',
    weight: 8,
    align: 'CENTER'
  })
  expect(readShaderPaints(node)).toHaveLength(3)
  const reopened = getNodeOrThrow(parsePenFile(writePenFile(graph)), 'shader')
  const shaders = readShaderPaints(reopened).map((entry) => fragmentShaderOf(entry.preset))
  expect(shaders.map((entry) => entry?.url)).toEqual(['checks.glsl', 'second.glsl', 'checks.glsl'])
  expect(shaders.every((entry) => entry?.source === source)).toBe(true)
  expect(shaders[0]?.uniforms).toEqual(paint.uniforms)
  expect(reopened.strokes[0].weight).toBe(8)
})

test('a missing external shader preserves its URL and overrides for recovery', () => {
  const graph = parsePenFile(JSON.stringify(document))
  const shaders = readShaderPaints(getNodeOrThrow(graph, 'shader'))
  expect(fragmentShaderOf(shaders[0].preset)).toEqual({
    url: 'checks.glsl',
    source: '',
    uniforms: paint.uniforms
  })
  expect(() => writePenFile(graph)).not.toThrow()
})

test('rejects non-finite shader overrides instead of replacing a shader with a blank paint', () => {
  const invalid = structuredClone(document)
  invalid.children[0].fill[0].uniforms.size = Infinity
  expect(() => buildPenGraph(invalid)).toThrow('Paint shader')
})
