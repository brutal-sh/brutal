import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import { imageHeader } from '@open-pencil/scene-graph/images'

import { browserImageSnapshot } from '@/app/browser-preview/image'

import { testPath } from '#tests/helpers/paths'

const png = new Uint8Array(await readFile(testPath('fixtures/vectorize/python_logo.png')))

test('browser snapshot retains full-resolution pixels at logical display dimensions', () => {
  const header = imageHeader(png)
  if (!header) throw new Error('Invalid PNG fixture')
  const snapshot = browserImageSnapshot(png, 2)
  expect(snapshot.nodes).toHaveLength(1)
  expect(snapshot.nodes[0]?.type).toBe('RECTANGLE')
  expect(snapshot.nodes[0]?.width).toBe(header.width / 2)
  expect(snapshot.nodes[0]?.height).toBe(header.height / 2)
  expect(snapshot.nodes[0]?.fills.some((fill) => fill.type === 'IMAGE')).toBe(true)
  expect([...snapshot.images.values()][0]).toEqual(png)
})

test('browser snapshot refuses invalid density and malformed image bytes', () => {
  expect(() => browserImageSnapshot(png, 0)).toThrow('dimensions')
  expect(() => browserImageSnapshot(png, Infinity)).toThrow('dimensions')
  expect(() => browserImageSnapshot(new Uint8Array([1, 2, 3]), 2)).toThrow('dimensions')
  const oversized = png.slice()
  const header = new DataView(oversized.buffer)
  header.setUint32(16, 65536)
  header.setUint32(20, 65536)
  expect(() => browserImageSnapshot(oversized, 2)).toThrow('dimensions')
})
