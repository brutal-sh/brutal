import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { SkiaRenderer } from '@open-pencil/core/canvas'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { createCanvasKitRasterCodec, initCanvasKit } from '@open-pencil/core/io/formats/raster'
import { colorToFill } from '@open-pencil/scene-graph/color'
import { fragmentShaderPreset } from '@open-pencil/scene-graph/shaders'

import { createExportTargetActions } from '@/app/document/export/files'

import { expectDefined } from '#tests/helpers/assert'

test('an off-page source-only shader exports real pixels before its scheduled frame exists', async () => {
  const ck = await initCanvasKit()
  const codec = createCanvasKitRasterCodec(ck)
  const png = expectDefined(
    codec.encodePNG({ width: 1, height: 1, data: new Uint8Array([51, 102, 153, 255]) }),
    'shader frame'
  )
  const editor = createEditor({ shaderRasterizer: { render: async () => png } })
  const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1), 'surface'))
  editor.setCanvasKit(ck, renderer)
  try {
    const shown = editor.state.currentPageId
    const other = editor.graph.addPage('Other')
    const node = editor.graph.createNode('RECTANGLE', other.id, {
      width: 20,
      height: 10,
      fills: [colorToFill('#FFFFFF')]
    })
    const actions = createExportTargetActions(
      editor,
      editor.state,
      new IORegistry(BUILTIN_IO_FORMATS)
    )
    const source = fragmentShaderPreset({
      url: 'blue.glsl',
      source: 'void main(){gl_FragColor=vec4(.2,.4,.6,1.);}',
      uniforms: {}
    })
    editor.setShaderPaint([node.id], 'fills', 0, source)
    const bytes = expectDefined(await actions.renderExportImage([node.id], 1, 'PNG'), 'export')
    const image = expectDefined(codec.decode(bytes), 'decoded export')
    expect([image.width, image.height]).toEqual([20, 10])
    expect(Array.from(image.data.slice(0, 4))).toEqual([51, 102, 153, 255])
    expect(editor.state.currentPageId).toBe(shown)

    editor.graph.images.clear()
    editor.graph.updateNode(node.id, { width: 30 })
    await actions.prepareExportTarget({ scope: 'node', nodeId: node.id })
    expect(editor.graph.images.size).toBe(1)
  } finally {
    editor.dispose()
    renderer.destroy()
  }
})
