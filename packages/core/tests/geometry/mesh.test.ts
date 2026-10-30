import { expect, test } from 'bun:test'

import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'

import { hitTestMeshHandles, meshHandleLayout } from '#core/geometry/mesh'

test('mesh handles include both ends of selected edges and keep canvas hit targets', () => {
  const layout = meshHandleLayout(
    createMeshGradient(),
    200,
    100,
    (p) => ({ x: p.x + 20, y: p.y + 30 }),
    4
  )
  expect(layout.points[4]).toEqual({ x: 120, y: 80 })
  expect(layout.curves).toHaveLength(12)
  expect(layout.handles).toHaveLength(8)
  expect(hitTestMeshHandles(layout, { x: 120, y: 80 })).toEqual({ kind: 'point', index: 4 })
  expect(hitTestMeshHandles(layout, { x: 145, y: 80 })).toEqual({
    kind: 'handle',
    index: 4,
    side: 'rightHandle'
  })
  expect(hitTestMeshHandles(layout, { x: 900, y: 900 })).toBeNull()
})

test('multiple Mesh vertices expose the union of their incident edge handles', () => {
  const layout = meshHandleLayout(createMeshGradient(), 200, 100, (point) => point, [0, 4])
  expect(layout.handles).toHaveLength(12)
  expect(layout.handles.some((handle) => handle.index === 0 && handle.side === 'rightHandle')).toBe(
    true
  )
  expect(
    layout.handles.some((handle) => handle.index === 4 && handle.side === 'bottomHandle')
  ).toBe(true)
})
