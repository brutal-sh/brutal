import { describe, expect, test } from 'bun:test'

import { SceneGraph, type Fill } from '@open-pencil/scene-graph'
import { copyFills } from '@open-pencil/scene-graph/copy'
import { applyGradientTransform } from '@open-pencil/scene-graph/gradient'
import { createMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'
import {
  hasIconFills,
  iconDrawing,
  iconGlyph,
  isIconModified,
  readIcon,
  readIconPaintSource,
  withIcon,
  withIconPaintSource,
  withIconTint
} from '@open-pencil/scene-graph/icons'
import { hasInstanceOverride, recordInstanceOverride } from '@open-pencil/scene-graph/instances'

const white: Fill = { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }
const green: Fill = {
  type: 'SOLID',
  color: { r: 0, g: 1, b: 0, a: 1 },
  opacity: 0.25,
  visible: true
}

function fixture(owned = true) {
  const graph = new SceneGraph()
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    width: 48,
    height: 24,
    fills: [white]
  })
  const path = graph.createNode('VECTOR', frame.id, {
    x: 12,
    width: 24,
    height: 24,
    fills: [{ ...white, opacity: 0.5 }],
    strokes: [{ ...white, weight: 2, align: 'CENTER', cap: 'ROUND', join: 'ROUND' }]
  })
  graph.updateNode(path.id, { pluginData: withIconTint(path, ['fill', 'stroke']) })
  graph.updateNode(path.id, { pluginData: withIconPaintSource(path) })
  graph.updateNode(frame.id, {
    pluginData: withIcon(frame, {
      name: 'lucide:heart',
      ...(owned && { paintSource: 'frame' as const })
    })
  })
  return { graph, frame, path }
}

describe('authored icon fills', () => {
  test('a nested icon keeps its derived paint override when its containing instance syncs', () => {
    const { graph, frame, path } = fixture()
    const page = graph.getPages()[0]
    const component = graph.createNode('COMPONENT', page.id, { width: 100, height: 100 })
    graph.reparentNode(frame.id, component.id)
    const instance = graph.createInstance(component.id, page.id)
    if (!instance) throw new Error('Containing instance missing')
    const copy = graph.getChildren(instance.id).find((node) => node.componentId === frame.id)
    const glyph = copy && graph.getChildren(copy.id).find((node) => node.componentId === path.id)
    if (!copy || !glyph) throw new Error('Nested icon missing')
    graph.updateNode(copy.id, { fills: [green] })
    recordInstanceOverride(graph, copy.id, ['fills'])
    expect(hasInstanceOverride(graph, glyph.id, 'fills')).toBe(true)
    graph.syncInstance(instance.id)
    expect(copy.fills).toEqual([green])
    expect(glyph.fills[0]).toMatchObject({ color: green.color, opacity: 0.125 })
    expect(frame.fills).toEqual([white])
  })

  test('paint changes keep the glyph baseline but do not bless earlier artwork edits', () => {
    const { graph, frame, path } = fixture()
    const glyph = iconGlyph(graph, frame)
    const drawing = iconDrawing(graph, frame)
    graph.updateNode(frame.id, {
      pluginData: withIcon(frame, { name: 'lucide:heart', paintSource: 'frame', glyph, drawing })
    })
    graph.updateNode(frame.id, { fills: [green, white] })
    expect(isIconModified(graph, frame)).toBe(false)
    expect(iconDrawing(graph, frame)).toBe(drawing)
    graph.updateNode(frame.id, { fills: [] })
    expect(isIconModified(graph, frame)).toBe(false)
    expect(iconDrawing(graph, frame)).toBe(drawing)
    graph.updateNode(path.id, { rotation: 15 })
    graph.updateNode(frame.id, { fills: [white] })
    expect(isIconModified(graph, frame)).toBe(true)
    expect(readIcon(frame)?.glyph).toBe(glyph)
  })

  test('resizing a stroke keeps its new geometry through subsequent paint edits', () => {
    const { graph, frame, path } = fixture()
    graph.updateNode(path.id, {
      width: 48,
      height: 48,
      strokes: path.strokes.map((stroke) => ({ ...stroke, weight: 4 }))
    })
    graph.updateNode(frame.id, { fills: [green] })
    expect(path.strokes[0].weight).toBe(4)
  })

  test('replaces a stack and restores an empty stack without losing intrinsic opacity or stroke geometry', () => {
    const { graph, frame, path } = fixture()
    graph.updateNode(frame.id, { fills: [white, { ...green, visible: false }] })
    expect(path.fills).toHaveLength(2)
    expect(path.fills[1]).toMatchObject({ opacity: 0.125, visible: false })
    expect(path.strokes[1]).toMatchObject({
      weight: 2,
      cap: 'ROUND',
      join: 'ROUND',
      opacity: 0.25,
      visible: false
    })
    graph.updateNode(frame.id, { fills: [] })
    expect(path.fills).toEqual([])
    expect(path.strokes).toEqual([])
    graph.updateNode(frame.id, { fills: [green] })
    expect(path.fills).toHaveLength(1)
    expect(path.fills[0]).toMatchObject({ color: green.color, opacity: 0.125 })
    expect(path.strokes[0]).toMatchObject({ weight: 2, opacity: 0.25 })
    expect(readIconPaintSource(path)?.fills[0].opacity).toBe(0.5)
  })

  test('projects graph previews and restored properties through the same path', () => {
    const { graph, frame, path } = fixture()
    const before = structuredClone({ fills: path.fills, strokes: path.strokes })
    const previewed: string[] = []
    graph.onNodeEvents({ previewUpdated: (id) => previewed.push(id) })
    graph.runPreviewUpdates(() => graph.updateNode(frame.id, { fills: [green] }))
    expect(path.strokes[0].color).toEqual(green.color)
    expect(previewed).toContain(path.id)
    expect(previewed).toContain(frame.id)
    graph.restoreNodeProperties(frame.id, { fills: [white] }, [])
    expect({ fills: path.fills, strokes: path.strokes }).toEqual(before)
  })

  test('samples the centered glyph in its parent gradient space', () => {
    const { graph, frame, path } = fixture()
    graph.updateNode(frame.id, {
      fills: [
        {
          ...white,
          type: 'GRADIENT_LINEAR',
          gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
        }
      ]
    })
    const transform = path.strokes[0].gradientTransform
    if (!transform) throw new Error('Projected gradient missing')
    expect(applyGradientTransform(transform, { x: 0, y: 0.5 })).toEqual({ x: 0.25, y: 0.5 })
    expect(applyGradientTransform(transform, { x: 1, y: 0.5 })).toEqual({ x: 0.75, y: 0.5 })
    graph.updateNode(path.id, { x: 0 })
    const moved = path.strokes[0].gradientTransform
    if (!moved) throw new Error('Moved gradient missing')
    expect(applyGradientTransform(moved, { x: 0, y: 0.5 })).toEqual({ x: 0, y: 0.5 })
  })

  test('leaves legacy icon backgrounds and artwork alone', () => {
    const { graph, frame, path } = fixture(false)
    const before = structuredClone({ fills: path.fills, strokes: path.strokes })
    graph.updateNode(frame.id, { fills: [green] })
    expect(hasIconFills(frame)).toBe(false)
    expect(frame.fills).toEqual([green])
    expect({ fills: path.fills, strokes: path.strokes }).toEqual(before)
  })

  test('projects mesh positions and relative handles without changing the authored mesh', () => {
    const { graph, frame, path } = fixture()
    const mesh = createMeshGradient(2, 2)
    mesh.points[0].rightHandle = { x: 0.2, y: 0.1 }
    graph.updateNode(path.id, { y: 6, height: 12 })
    graph.updateNode(frame.id, { fills: [{ ...white, type: 'GRADIENT_MESH', meshGradient: mesh }] })
    const projected = path.fills[0].meshGradient
    expect(projected?.points[0]).toMatchObject({
      position: { x: -0.5, y: -0.5 },
      rightHandle: { x: 0.4, y: 0.2 }
    })
    expect(projected?.points[3].position).toEqual({ x: 1.5, y: 1.5 })
    expect(frame.fills[0].meshGradient).toEqual(mesh)
    expect(mesh.points[0].position).toEqual({ x: 0, y: 0 })
    expect(mesh.points[0].rightHandle).toEqual({ x: 0.2, y: 0.1 })
  })

  test('keeps independently colored paints and copies each derived color', () => {
    const { graph, frame, path } = fixture()
    graph.updateNode(path.id, { pluginData: withIconTint(path, ['stroke']) })
    const before = copyFills(path.fills)
    graph.updateNode(frame.id, { fills: [green] })
    expect(path.fills).toEqual(before)
    expect(path.strokes[0].color).toEqual(green.color)
    expect(path.strokes[0].color).not.toBe(frame.fills[0].color)
  })
})
