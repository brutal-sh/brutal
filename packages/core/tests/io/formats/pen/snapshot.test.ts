import { expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { PenExportError } from '@open-pencil/pen'
import { scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { fragmentShaderOf, readShaderPaints } from '@open-pencil/scene-graph/shaders'

import { exportPenSnapshot } from '#core/io/formats/pen/snapshot'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const encode = (data: string | Uint8Array) =>
  typeof data === 'string' ? new TextEncoder().encode(data) : data

test('snapshot keeps same-name Script uploads distinct and reopens relative sources without graph edits', async () => {
  const { graph } = await io.readDocument({
    name: 'original.pen',
    data: encode(
      JSON.stringify({
        version: '2.21',
        children: ['first', 'second', 'same'].map((id) => ({
          id,
          type: 'script',
          scriptUri: 'probe.js',
          width: 200,
          height: 200
        }))
      })
    )
  })
  const first = '/** @schema 2.21 */\nreturn []; // first'
  const second = '/** @schema 2.21 */\nreturn []; // second'
  const before = (await io.writeDocument('pen', graph)).data
  const snapshot = exportPenSnapshot(
    graph,
    new Map([
      ['first', first],
      ['second', second],
      ['same', first]
    ])
  )
  const assets = new Map(snapshot.assets?.map((asset) => [asset.path, asset.content]))
  expect(assets.size).toBe(2)
  const { graph: reopened } = await io.readDocument({
    name: 'relocated/design.pen',
    data: encode(snapshot.data)
  })
  const source = (id: string) => assets.get(scriptOfNode(getNodeOrThrow(reopened, id))?.uri ?? '')
  expect(source('first')).toBe(first)
  expect(source('second')).toBe(second)
  expect(source('same')).toBe(first)
  expect([...assets.keys()]).toEqual(['scripts/1.js', 'scripts/2.js'])
  expect([...snapshot.sources.values()]).toEqual(['probe.js', 'probe.js'])
  expect((await io.writeDocument('pen', graph)).data).toBe(before)
  expect(() => exportPenSnapshot(graph, new Map([['first', first]]))).toThrow(
    /linked Script sources/
  )
  expect(() => exportPenSnapshot(graph, new Map([['first', 'é'.repeat(128_001)]]))).toThrow(
    /256 KB/
  )
  expect((await io.writeDocument('pen', graph)).data).toBe(before)
})

test('snapshot relocates images and shader fills/strokes without source-file access or graph edits', async () => {
  const source =
    'precision mediump float; uniform float size; void main(){gl_FragColor=vec4(size);}'
  const image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/69cbGAAAAABJRU5ErkJggg=='
  const { graph } = await io.readDocument({
    name: 'original.pen',
    data: encode(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'frame',
            type: 'frame',
            width: 200,
            height: 200,
            children: [
              {
                id: 'image',
                type: 'rectangle',
                width: 64,
                height: 64,
                fill: { type: 'image', url: image }
              },
              {
                id: 'shader',
                type: 'rectangle',
                width: 64,
                height: 64,
                fill: {
                  type: 'shader',
                  url: '/old/computer/checks.glsl',
                  openPenSource: source,
                  uniforms: { size: 0.6 }
                },
                stroke: {
                  thickness: 2,
                  fill: {
                    type: 'shader',
                    url: '/old/computer/checks.glsl',
                    openPenSource: source,
                    uniforms: { size: 0.2 }
                  }
                }
              }
            ]
          }
        ]
      })
    )
  })
  const before = (await io.writeDocument('pen', graph)).data
  const snapshot = exportPenSnapshot(graph)
  expect(snapshot.data).not.toContain('/old/computer')
  const assets = new Map(snapshot.assets?.map((asset) => [asset.path, encode(asset.content)]))
  expect(assets.size).toBe(2)
  expect([...assets.keys()].every((path) => /^(images|shaders)\/\d+\.(png|glsl)$/.test(path))).toBe(
    true
  )
  const requests: string[] = []
  const reopened = await io.readDocument({
    name: 'relocated/design.pen',
    data: encode(snapshot.data),
    readAsset: async (path) => {
      requests.push(path)
      return assets.get(path) ?? null
    }
  })
  expect(requests.sort()).toEqual([...assets.keys()].sort())
  const reopenedImage = getNodeOrThrow(reopened.graph, 'image').fills[0]
  expect(reopened.graph.images.get(reopenedImage.imageHash ?? '')).toEqual(
    [...assets.entries()].find(([path]) => path.startsWith('images/'))?.[1]
  )
  const shaders = readShaderPaints(getNodeOrThrow(reopened.graph, 'shader'))
  expect(shaders.map((shader) => fragmentShaderOf(shader.preset)?.source)).toEqual([source, source])
  expect(shaders.map((shader) => fragmentShaderOf(shader.preset)?.uniforms)).toEqual([
    { size: 0.6 },
    { size: 0.2 }
  ])
  expect((await io.writeDocument('pen', graph)).data).toBe(before)
})

test('snapshot preserves independent source identity on reusable Scripts and linked instance overrides', async () => {
  const { graph } = await io.readDocument({
    name: 'components.pen',
    data: encode(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            type: 'script',
            id: 'main',
            reusable: true,
            scriptUri: 'probe.js',
            width: 200,
            height: 200
          },
          { type: 'ref', id: 'instance', ref: 'main', scriptUri: 'probe.js', x: 250 }
        ]
      })
    )
  })
  const before = (await io.writeDocument('pen', graph)).data
  const snapshot = exportPenSnapshot(
    graph,
    new Map([
      ['main', 'return []; // main'],
      ['instance', 'return []; // instance']
    ])
  )
  const { graph: reopened } = await io.readDocument({
    name: 'relocated/components.pen',
    data: encode(snapshot.data)
  })
  expect(scriptOfNode(getNodeOrThrow(reopened, 'main'))?.uri).toBe('scripts/1.js')
  expect(scriptOfNode(getNodeOrThrow(reopened, 'instance'))?.uri).toBe('scripts/2.js')
  expect(getNodeOrThrow(reopened, 'instance').componentId).toBe('main')
  expect(snapshot.assets?.map((asset) => asset.content)).toEqual([
    'return []; // main',
    'return []; // instance'
  ])
  expect((await io.writeDocument('pen', graph)).data).toBe(before)
})

test('snapshot preserves writer refusal for unsupported multi-page content', async () => {
  const { graph } = await io.readDocument({ name: 'empty.pen', data: encode('{"children":[]}') })
  graph.addPage('Second')
  expect(() => exportPenSnapshot(graph)).toThrow(PenExportError)
})

test('snapshot retains the intentionally empty shader without turning it into a missing file', async () => {
  const { graph } = await io.readDocument({
    name: 'empty-shader.pen',
    data: encode(
      JSON.stringify({
        children: [
          {
            id: 'empty',
            type: 'rectangle',
            width: 20,
            height: 20,
            fill: { type: 'shader', url: '', openPenSource: '' }
          }
        ]
      })
    )
  })
  const snapshot = exportPenSnapshot(graph)
  expect(snapshot.assets).toEqual([])
  const { graph: reopened } = await io.readDocument({
    name: 'relocated.pen',
    data: encode(snapshot.data),
    readAsset: async () => {
      throw new Error('Empty shader must not request a file')
    }
  })
  expect(
    fragmentShaderOf(readShaderPaints(getNodeOrThrow(reopened, 'empty'))[0].preset)
  ).toMatchObject({ url: '', source: '' })
})

test('snapshot keeps distinct source references with colliding basenames separate', async () => {
  const source = 'void main(){gl_FragColor=vec4(1.0);}'
  const { graph } = await io.readDocument({
    name: 'collisions.pen',
    data: encode(
      JSON.stringify({
        children: [
          {
            id: 'a',
            type: 'rectangle',
            width: 20,
            height: 20,
            fill: { type: 'shader', url: '/one/checks.glsl', openPenSource: source }
          },
          {
            id: 'b',
            type: 'rectangle',
            width: 20,
            height: 20,
            fill: { type: 'shader', url: '/two/checks.glsl', openPenSource: source }
          }
        ]
      })
    )
  })
  const snapshot = exportPenSnapshot(graph)
  expect(snapshot.assets?.map((asset) => asset.path)).toEqual(['shaders/1.glsl', 'shaders/2.glsl'])
  expect([...snapshot.sources.values()]).toEqual(['/one/checks.glsl', '/two/checks.glsl'])
})
