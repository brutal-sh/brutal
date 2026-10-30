import { expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { BUILTIN_IO_FORMATS, IORegistry, penFormat } from '@open-pencil/core/io'
import { fragmentShaderOf, readShaderPaints } from '@open-pencil/scene-graph/shaders'

test('visual exports refuse a source-only shader rather than delivering blank artwork', async () => {
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const data = new TextEncoder().encode(
    JSON.stringify({
      children: [
        {
          id: 'shader',
          type: 'rectangle',
          width: 64,
          height: 64,
          fill: {
            type: 'shader',
            url: 'checks.glsl',
            openPenSource: 'void main(){gl_FragColor=vec4(1.0);}'
          }
        }
      ]
    })
  )
  const { graph } = await io.readDocument({ name: 'source.pen', data })
  for (const format of ['png', 'svg', 'pdf', 'html'])
    await expect(
      io.exportContent(format, { graph, target: { scope: 'node', nodeId: 'shader' } })
    ).rejects.toThrow('Render the GLSL shader')
})

test('Pen I/O loads local shader sources through the host asset boundary', async () => {
  const requested: { path: string; maxBytes: number | undefined }[] = []
  const source = 'precision mediump float; void main(){gl_FragColor=vec4(1.0);}'
  const data = new TextEncoder().encode(
    JSON.stringify({
      version: '2.21',
      children: [
        {
          id: 'shader',
          type: 'rectangle',
          width: 64,
          height: 64,
          fill: { type: 'shader', url: './my%20shader.glsl', uniforms: { size: 24 } }
        }
      ]
    })
  )
  const io = new IORegistry([penFormat])
  const { graph } = await io.readDocument({
    name: 'shader.pen',
    data,
    readAsset: async (path, options) => {
      requested.push({ path, maxBytes: options?.maxBytes })
      return new TextEncoder().encode(source)
    }
  })
  expect(requested).toEqual([{ path: './my shader.glsl', maxBytes: 1048576 }])
  const shader = readShaderPaints(getNodeOrThrow(graph, 'shader'))[0]
  expect(fragmentShaderOf(shader.preset)).toEqual({
    url: './my%20shader.glsl',
    source,
    uniforms: { size: 24 }
  })
  const written = await io.writeDocument('pen', graph)
  const reopened = await io.readDocument({
    name: 'shader.pen',
    data: typeof written.data === 'string' ? new TextEncoder().encode(written.data) : written.data
  })
  expect(
    fragmentShaderOf(readShaderPaints(getNodeOrThrow(reopened.graph, 'shader'))[0].preset)?.source
  ).toBe(source)
})
