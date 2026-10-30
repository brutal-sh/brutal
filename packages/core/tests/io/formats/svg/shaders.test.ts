import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { exportPDFDocument } from '@open-pencil/core/io/formats/pdf'
import {
  createCanvasKitRasterCodec,
  initCanvasKit,
  headlessRenderNodes
} from '@open-pencil/core/io/formats/raster'
import { renderNodesToSVG } from '@open-pencil/core/io/formats/svg'
import { SceneGraph } from '@open-pencil/scene-graph'
import {
  createShaderPaint,
  fragmentShaderPreset,
  shaderPresetKey,
  withShaderPaints
} from '@open-pencil/scene-graph/shaders'

test.each(['fills', 'strokes'] as const)(
  'GLSL %s retain their rendered pattern and opacity in SVG and PDF',
  async (field) => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const preset = fragmentShaderPreset({
      url: 'blue.glsl',
      source: 'void main(){gl_FragColor=vec4(.2,.4,.6,1.);}',
      uniforms: {}
    })
    const { paint, shader } = createShaderPaint(preset)
    const png = expectDefined(
      createCanvasKitRasterCodec(await initCanvasKit()).encodePNG({
        width: 1,
        height: 1,
        data: new Uint8Array([51, 102, 153, 255])
      }),
      'shader image'
    )
    graph.images.set(shader.image, png)
    const node = graph.createNode('RECTANGLE', pageId, {
      width: 40,
      height: 20,
      fills: field === 'fills' ? [{ ...paint, opacity: 0.5 }] : [],
      strokes: field === 'strokes' ? [{ ...paint, opacity: 0.5, weight: 4, align: 'INSIDE' }] : []
    })
    graph.updateNode(node.id, {
      pluginData: withShaderPaints(
        node,
        [...node.fills, ...node.strokes],
        [{ ...shader, frame: { width: 40, height: 20, preset: shaderPresetKey(preset) } }]
      )
    })
    const svg = expectDefined(renderNodesToSVG(graph, pageId, [node.id]), 'SVG')
    const attribute = field === 'fills' ? 'fill' : 'stroke'
    expect(svg).toMatch(new RegExp(`${attribute}="url\\(#img\\d+\\)"`))
    expect(svg).toContain(`${attribute}-opacity="0.5"`)
    expect(svg).toContain('data:image/png;base64,')
    const pixels = expectDefined(
      createCanvasKitRasterCodec(await initCanvasKit()).decode(
        expectDefined(
          await headlessRenderNodes(graph, pageId, [node.id], { format: 'PNG', scale: 2 })
        )
      )
    )
    const offset = (20 * pixels.width + (field === 'fills' ? 20 : 2)) * 4
    const pixel = Array.from(pixels.data.slice(offset, offset + 4))
    for (const [index, value] of [51, 102, 153, 128].entries())
      expect(Math.abs(pixel[index] - value)).toBeLessThanOrEqual(1)
    const pdf = expectDefined(
      await exportPDFDocument(graph, [{ pageId, nodeIds: [node.id] }], { embedFonts: false }),
      'PDF'
    )
    expect(new TextDecoder().decode(pdf.data)).toContain('/Subtype /Image')
  }
)
