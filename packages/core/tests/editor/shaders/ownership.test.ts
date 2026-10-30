import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@open-pencil/core'
import { colorToFill } from '@open-pencil/scene-graph/color'
import { copyFills } from '@open-pencil/scene-graph/copy'
import { computeImageHash, nodeImageHashes } from '@open-pencil/scene-graph/images'
import {
  fragmentShaderOf,
  fragmentShaderPreset,
  shaderOfPaint,
  withShaderPaints
} from '@open-pencil/scene-graph/shaders'

const preset = (value: number) =>
  fragmentShaderPreset({
    url: 'independent.glsl',
    source: 'uniform float value; void main(){gl_FragColor=vec4(value);}',
    uniforms: { value }
  })

async function setup() {
  const editor = createEditor({
    shaderRasterizer: {
      render: async (source, _pixels, size) =>
        new Uint8Array([Number(fragmentShaderOf(source)?.uniforms.value), size?.width ?? 0])
    }
  })
  const graph = editor.graph
  const page = editor.state.currentPageId
  const node = graph.createNode('RECTANGLE', page, {
    width: 20,
    height: 20,
    fills: [colorToFill('#FFFFFF')]
  })
  editor.setShaderPaint([node.id], 'fills', 0, preset(10))
  await editor.drawPageShaderFrames(page)
  return { editor, graph, page, node, hash: expectDefined(node.fills[0].imageHash, 'frame hash') }
}

for (const consumer of ['shader', 'image', 'stroke', 'path'] as const)
  for (const edit of ['preset', 'size'] as const)
    test(`${edit} changes and Undo preserve a ${consumer} copy's frame`, async () => {
      const { editor, graph, page, node, hash } = await setup()
      try {
        const fills = copyFills(node.fills)
        const copy = graph.createNode(consumer === 'path' ? 'VECTOR' : 'RECTANGLE', page, {
          width: 20,
          height: 20,
          fills: consumer === 'stroke' || consumer === 'path' ? [] : fills,
          strokes: consumer === 'stroke' ? [{ ...fills[0], weight: 4, align: 'INSIDE' }] : [],
          fillGeometry:
            consumer === 'path'
              ? [{ windingRule: 'NONZERO', commandsBlob: new Uint8Array(), fills }]
              : [],
          pluginData: consumer === 'shader' ? structuredClone(node.pluginData) : []
        })
        if (edit === 'preset') editor.setShaderPaint([node.id], 'fills', 0, preset(20))
        else editor.updateNodeWithUndo(node.id, { width: 40 })
        await editor.drawPageShaderFrames(page)
        expect(node.fills[0].imageHash).not.toBe(hash)
        expect(graph.images.get(hash)).toEqual(new Uint8Array([10, 20]))
        expect([...nodeImageHashes(copy)]).toEqual([hash])
        editor.undoAction()
        await editor.drawPageShaderFrames(page)
        expect(node.width).toBe(20)
        expect(shaderOfPaint(node, node.fills[0])?.preset).toEqual(preset(10))
        expect(graph.images.get(hash)).toEqual(new Uint8Array([10, 20]))
      } finally {
        editor.dispose()
      }
    })

test('editing a fill preserves another stroke slot and its shader metadata', async () => {
  const { editor, graph, page, node, hash } = await setup()
  try {
    graph.updateNode(node.id, { strokes: [{ ...node.fills[0], weight: 4, align: 'INSIDE' }] })
    editor.setShaderPaint([node.id], 'fills', 0, preset(20))
    await editor.drawPageShaderFrames(page)
    expect(node.strokes[0].imageHash).toBe(hash)
    expect(shaderOfPaint(node, node.strokes[0])?.preset).toEqual(preset(10))
    expect(graph.images.get(hash)).toEqual(new Uint8Array([10, 20]))
    expect(graph.images.get(expectDefined(node.fills[0].imageHash))).toEqual(
      new Uint8Array([20, 20])
    )
  } finally {
    editor.dispose()
  }
})

test('content-addressed frames remain unchanged for consumers on unpopulated pages', async () => {
  const { editor, graph, page, node, hash } = await setup()
  try {
    const bytes = expectDefined(graph.images.get(hash))
    const contentHash = computeImageHash(bytes)
    const shader = expectDefined(shaderOfPaint(node, node.fills[0]))
    const fills = [{ ...node.fills[0], imageHash: contentHash }]
    graph.images.set(contentHash, bytes)
    graph.updateNode(node.id, {
      fills,
      pluginData: withShaderPaints(node, fills, [{ ...shader, image: contentHash }])
    })
    editor.setShaderPaint([node.id], 'fills', 0, preset(20))
    await editor.drawPageShaderFrames(page)
    expect(node.fills[0].imageHash).not.toBe(contentHash)
    expect(graph.images.get(contentHash)).toEqual(bytes)
  } finally {
    editor.dispose()
  }
})

test('reapplying an unchanged shader adds no invisible Undo step or frame invalidation', async () => {
  const { editor, node } = await setup()
  try {
    editor.setShaderPaint([node.id], 'fills', 0, preset(10))
    editor.undoAction()
    expect(node.fills[0].type).toBe('SOLID')
  } finally {
    editor.dispose()
  }
})

test('a new image consumer introduced during rendering retains the previous frame', async () => {
  const { editor, graph, page, node, hash } = await setup()
  try {
    let release: (bytes: Uint8Array) => void = () => {
      throw new Error('Renderer not started')
    }
    let started: () => void = () => {
      throw new Error('Renderer not initialized')
    }
    const drawingStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    const pending = new Promise<Uint8Array>((resolve) => {
      release = resolve
    })
    editor.setShaderRasterizer({
      render: async () => {
        started()
        return pending
      }
    })
    editor.setShaderPaint([node.id], 'fills', 0, preset(20))
    const drawing = editor.drawPageShaderFrames(page)
    await drawingStarted
    const copy = graph.createNode('RECTANGLE', page, {
      width: 20,
      height: 20,
      fills: copyFills(node.fills)
    })
    release(new Uint8Array([20, 20]))
    await drawing
    expect(copy.fills[0].imageHash).toBe(hash)
    expect(graph.images.get(hash)).toEqual(new Uint8Array([10, 20]))
    expect(graph.images.get(expectDefined(node.fills[0].imageHash))).toEqual(
      new Uint8Array([20, 20])
    )
  } finally {
    editor.dispose()
  }
})
