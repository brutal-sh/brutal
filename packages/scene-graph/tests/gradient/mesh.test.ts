import { expect, test } from 'bun:test'

import { parseColor } from '#scene-graph/color'
import { copyFill } from '#scene-graph/copy'
import { createMeshGradient, tessellateMeshPatch } from '#scene-graph/gradient/mesh'
import { SceneGraph } from '#scene-graph/graph'
import { meshGradientSchema } from '#scene-graph/paints/schema'
import type { Fill } from '#scene-graph/types'
import { resolvedPaintBindings } from '#scene-graph/variables/bindings'
import * as v from 'valibot'

test('mesh dimensions count vertices, and reject malformed grids', () => {
  const mesh = createMeshGradient()
  expect(mesh.points).toHaveLength(9)
  expect(mesh.points[4].position).toEqual({ x: 0.5, y: 0.5 })
  expect(v.safeParse(meshGradientSchema, mesh).success).toBe(true)
  expect(v.safeParse(meshGradientSchema, { ...mesh, colors: [] }).success).toBe(false)
  expect(() => createMeshGradient(1, 3)).toThrow(RangeError)
  expect(() => createMeshGradient(7, 3)).toThrow(RangeError)
})

test('mesh copies isolate colors, positions and Bezier handles for Undo', () => {
  const mesh = createMeshGradient()
  mesh.points[4].rightHandle = { x: 0.1, y: 0.2 }
  const fill: Fill = {
    type: 'GRADIENT_MESH',
    color: parseColor('#FFFFFF'),
    opacity: 1,
    visible: true,
    meshGradient: mesh
  }
  const copy = copyFill(fill)
  mesh.colors[0].r = 0
  mesh.points[4].position.x = 0.8
  mesh.points[4].rightHandle.x = 0.7
  expect(copy.meshGradient?.colors[0].r).not.toBe(0)
  expect(copy.meshGradient?.points[4].position.x).toBe(0.5)
  expect(copy.meshGradient?.points[4].rightHandle?.x).toBe(0.1)
})

test('the measured patch retains exact corners and triangle winding', () => {
  const mesh = createMeshGradient(2, 2)
  mesh.colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'].map(parseColor)
  const patch = tessellateMeshPatch(mesh, 0, 0, 256, 128)
  expect(Array.from(patch.positions.slice(0, 2))).toEqual([0, 0])
  expect(Array.from(patch.positions.slice(-2))).toEqual([256, 128])
  expect(Array.from(patch.colors.slice(0, 1))).toEqual([0xffff0000])
  expect(patch.colors[32]).toBe(0xff00ff00)
  expect(patch.colors[32 * 33]).toBe(0xff0000ff)
  expect(patch.colors[16 * 33 + 16]).toBe(0xff7f7f7f)
  expect(patch.indices.slice(0, 6)).toEqual([0, 1, 33, 1, 34, 33])
})

test('mesh color bindings validate vertices and retain independent paint opacity', () => {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Mesh tokens')
  const color = parseColor('#AA228880')
  const variable = graph.createVariable('Ink', 'COLOR', collection.id, color)
  const number = graph.createVariable('Size', 'FLOAT', collection.id, 8)
  const node = graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    fills: [
      {
        type: 'GRADIENT_MESH',
        color: parseColor('#FFFFFF'),
        opacity: 0.7,
        visible: true,
        meshGradient: createMeshGradient(2, 2)
      }
    ]
  })
  const field = 'fills/0/meshGradient/colors/0'
  graph.bindVariable(node.id, field, variable.id)
  const resolved = resolvedPaintBindings(graph, node)
  expect(resolved.fills?.[0].meshGradient?.colors[0]).toEqual(color)
  expect(resolved.fills?.[0].opacity).toBe(0.7)
  expect(node.fills[0].meshGradient?.colors[0]).not.toEqual(color)
  expect(() => graph.bindVariable(node.id, field, number.id)).toThrow('color field')
  expect(() => graph.bindVariable(node.id, 'fills/0/meshGradient/colors/4', variable.id)).toThrow(
    'out of range'
  )
})
