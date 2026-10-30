import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { collectAllNodes } from '#core-tests/helpers/fig/traversal'

import { createEditor } from '@open-pencil/core'
import { exportFigFile, parseFigFile, populateFigPage } from '@open-pencil/core/io/formats/fig'
import { createCanvasKitRasterCodec, initCanvasKit } from '@open-pencil/core/io/formats/raster'
import { materializeFigFragment, parseFigBuffer } from '@open-pencil/fig'
import {
  embedClipboardImages,
  encodeFigmaClipboard,
  parseFigmaClipboard
} from '@open-pencil/fig/clipboard'
import { initCodec } from '@open-pencil/kiwi/fig/codec'
import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'
import { computeImageHash } from '@open-pencil/scene-graph/images'
import {
  createShaderPaint,
  fragmentShaderOf,
  fragmentShaderPreset,
  shaderOfPaint,
  shaderPresetKey,
  withShaderPaints
} from '@open-pencil/scene-graph/shaders'

const preset = (speed: number) =>
  fragmentShaderPreset({
    url: 'time.glsl',
    source:
      '/** @time */ uniform float time; uniform float speed; void main(){gl_FragColor=vec4(fract(time*speed),.25,.5,1.);}',
    uniforms: { speed }
  })

async function fixture() {
  await initCodec()
  const png = expectDefined(
    createCanvasKitRasterCodec(await initCanvasKit()).encodePNG({
      width: 1,
      height: 1,
      data: new Uint8Array([0, 64, 128, 255])
    })
  )
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const component = graph.createNode('COMPONENT', page.id, {
    name: 'Shader component',
    width: 40,
    height: 20
  })
  const entries = [1, 2, 3].map((speed) => createShaderPaint(preset(speed)))
  for (const { shader } of entries) graph.images.set(shader.image, png)
  const node = graph.createNode('RECTANGLE', component.id, {
    name: 'Shader slots',
    width: 40,
    height: 20,
    fills: entries.slice(0, 2).map(({ paint }) => paint),
    strokes: [{ ...entries[2].paint, weight: 4, align: 'INSIDE' }]
  })
  graph.updateNode(node.id, {
    pluginData: withShaderPaints(
      node,
      [...node.fills, ...node.strokes],
      entries.map(({ shader }) => ({
        ...shader,
        frame: { width: 40, height: 20, preset: shaderPresetKey(shader.preset) }
      }))
    )
  })
  return { graph, page, component, node, png }
}

function check(graph: SceneGraph, node: SceneNode, png: Uint8Array, speeds = [1, 2, 3]) {
  const paints = [...node.fills, ...node.strokes]
  expect(new Set(paints.map((paint) => paint.imageHash)).size).toBe(3)
  for (const [index, paint] of paints.entries()) {
    const shader = expectDefined(shaderOfPaint(node, paint), 'shader slot')
    expect(fragmentShaderOf(shader.preset)?.uniforms.speed).toBe(speeds[index])
    expect(graph.images.get(shader.image)).toEqual(png)
  }
}

test('identical time-zero PNGs keep three distinct shader slots through FIG and a second save', async () => {
  const { graph, png } = await fixture()
  let current = graph
  let previousImages: (string | undefined)[] | undefined
  for (let round = 0; round < 2; round++) {
    const bytes = await exportFigFile(current)
    const archive = parseFigBuffer(bytes.buffer as ArrayBuffer)
    expect(archive.images.map(([hash]) => hash)).toEqual([computeImageHash(png)])
    current = await parseFigFile(bytes.buffer as ArrayBuffer)
    const node = expectDefined(
      collectAllNodes(current).find((node) => node.name === 'Shader slots')
    )
    check(current, node, png)
    const images = [...node.fills, ...node.strokes].map((paint) => paint.imageHash)
    if (previousImages) expect(images).toEqual(previousImages)
    previousImages = images
  }
})

test('clipboard blobs retain identical shader frames with different presets', async () => {
  const { graph, png } = await fixture()
  const archive = parseFigBuffer((await exportFigFile(graph)).buffer as ArrayBuffer)
  embedClipboardImages(archive.nodeChanges, archive.blobs, new Map(archive.images))
  const clipboard = expectDefined(
    await parseFigmaClipboard(encodeFigmaClipboard(archive.nodeChanges, archive.blobs, 1))
  )
  const pasted = materializeFigFragment(clipboard.nodes, clipboard.blobs)
  const node = expectDefined(
    collectAllNodes(pasted.graph).find((node) => node.name === 'Shader slots')
  )
  check(pasted.graph, node, png)
})

test('an instance shader override keeps its own slot while its component retains the original', async () => {
  const { graph, page, component, png } = await fixture()
  const instance = expectDefined(
    graph.createInstance(component.id, page.id, { name: 'Shader instance' })
  )
  const child = expectDefined(graph.getChildren(instance.id)[0])
  const editor = createEditor({ graph, shaderRasterizer: { render: async () => png } })
  try {
    editor.setShaderPaint([child.id], 'fills', 1, preset(9))
    await editor.drawPageShaderFrames(page.id)
    const reopened = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
    const copy = expectDefined(collectAllNodes(reopened).find((node) => node.type === 'INSTANCE'))
    check(reopened, expectDefined(reopened.getChildren(copy.id)[0]), png, [1, 9, 3])
    const source = expectDefined(
      collectAllNodes(reopened).find((node) => node.type === 'COMPONENT')
    )
    check(reopened, expectDefined(reopened.getChildren(source.id)[0]), png)
  } finally {
    editor.dispose()
  }
})

test('lazy page loading retains live component shader edits and independent slot identities', async () => {
  const { graph, page, component, png } = await fixture()
  graph.createInstance(component.id, page.id, { name: 'First instance' })
  const second = graph.addPage('Second')
  graph.createInstance(component.id, second.id, { name: 'Second instance' })
  const reopened = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer, {
    populate: 'first-page'
  })
  const source = expectDefined(collectAllNodes(reopened).find((node) => node.type === 'COMPONENT'))
  const child = expectDefined(reopened.getChildren(source.id)[0])
  const editor = createEditor({ graph: reopened, shaderRasterizer: { render: async () => png } })
  try {
    editor.setShaderPaint([child.id], 'fills', 0, preset(7))
    await editor.drawPageShaderFrames(editor.state.currentPageId)
    const page = expectDefined(reopened.getPages().find((node) => node.name === 'Second'))
    await populateFigPage(reopened, page.id)
    const instance = expectDefined(
      reopened.getChildren(page.id).find((node) => node.name === 'Second instance')
    )
    check(reopened, expectDefined(reopened.getChildren(instance.id)[0]), png, [7, 2, 3])
    check(reopened, child, png, [7, 2, 3])
  } finally {
    editor.dispose()
  }
})

test('two versions of the same document keep different time presets independently addressable', async () => {
  const { graph, node, png } = await fixture()
  const before = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  const editor = createEditor({ graph, shaderRasterizer: { render: async () => png } })
  try {
    editor.setShaderPaint([node.id], 'fills', 0, preset(7))
    await editor.drawPageShaderFrames(editor.state.currentPageId)
    const after = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
    const original = expectDefined(
      collectAllNodes(before).find((node) => node.name === 'Shader slots')
    )
    const changed = expectDefined(
      collectAllNodes(after).find((node) => node.name === 'Shader slots')
    )
    expect(changed.id).toBe(original.id)
    expect(changed.fills[0].imageHash).not.toBe(original.fills[0].imageHash)
    check(before, original, png)
    check(after, changed, png, [7, 2, 3])
  } finally {
    editor.dispose()
  }
})
