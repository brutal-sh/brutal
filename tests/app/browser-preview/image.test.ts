import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import { imageHeader } from '@open-pencil/scene-graph/images'

import { browserImageSnapshot } from '@/app/browser-preview/image'

import { testPath } from '#tests/helpers/paths'

const png = new Uint8Array(await readFile(testPath('fixtures/vectorize/python_logo.png')))
const header = imageHeader(png)
if (!header) throw new Error('Invalid PNG fixture')
const slice = { png, width: header.width / 2, height: header.height / 2 }

test('browser screenshot retains native pixels and captured CSS dimensions', () => {
  const snapshot = browserImageSnapshot({
    url: 'https://example.test/',
    title: 'Captured page',
    slices: [slice]
  })
  expect(snapshot.nodes).toHaveLength(1)
  expect(snapshot.nodes[0]?.type).toBe('RECTANGLE')
  expect(snapshot.nodes[0]?.name).toBe('Captured page')
  expect(snapshot.nodes[0]?.width).toBe(slice.width)
  expect(snapshot.nodes[0]?.height).toBe(slice.height)
  expect(snapshot.nodes[0]?.fills.some((fill) => fill.type === 'IMAGE')).toBe(true)
  expect([...snapshot.images.values()][0]).toEqual(png)
})

test('multiple screenshots form one vertical frame with intact child pixels', () => {
  const snapshot = browserImageSnapshot({
    url: 'https://www.example.test/',
    title: 'Tall page',
    slices: [slice, slice]
  })
  const frame = snapshot.nodes[0]
  expect(snapshot.nodes).toHaveLength(1)
  expect(frame?.type).toBe('FRAME')
  expect(frame?.layoutMode).toBe('VERTICAL')
  expect(frame?.height).toBe(slice.height * 2)
  expect(frame?.children).toHaveLength(2)
  expect(frame?.children?.map((node) => [node.type, node.width, node.height, node.y])).toEqual([
    ['RECTANGLE', slice.width, slice.height, 0],
    ['RECTANGLE', slice.width, slice.height, slice.height]
  ])
  expect(frame?.children?.[1]?.name).toBe('screenshot-example.test-2.png')
  expect([...snapshot.images.values()][0]).toEqual(png)
})
