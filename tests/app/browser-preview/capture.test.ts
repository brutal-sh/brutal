import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

import { imageHeader } from '@open-pencil/scene-graph/images'

import { readBrowserCapture } from '@/app/browser-preview/capture'

import { testPath } from '#tests/helpers/paths'

const png = new Uint8Array(await readFile(testPath('fixtures/vectorize/python_logo.png')))
const header = imageHeader(png)
if (!header) throw new Error('Invalid screenshot fixture')
const requestId = '00000000-0000-4000-8000-000000000000'
const url = 'https://example.test/'
const slice = { width: header.width / 2, height: header.height / 2, bytes: png.length }
const manifest = { version: 1, requestId, url, title: 'Page', slices: [slice] }
function packet(metadata: unknown = manifest, images: Uint8Array[] = [png]) {
  const json = new TextEncoder().encode(JSON.stringify(metadata))
  const output = new Uint8Array(
    4 + json.length + images.reduce((sum, image) => sum + image.length, 0)
  )
  new DataView(output.buffer).setUint32(0, json.length, true)
  output.set(json, 4)
  let offset = 4 + json.length
  for (const image of images) {
    output.set(image, offset)
    offset += image.length
  }
  return output.buffer
}

test('capture payload preserves native PNG bytes and logical dimensions of each slice', () => {
  const result = readBrowserCapture(
    packet({ ...manifest, slices: [slice, slice] }, [png, png]),
    requestId,
    url
  )
  expect(result.title).toBe('Page')
  expect(result.slices).toHaveLength(2)
  expect(result.slices[1]).toEqual({ png, width: slice.width, height: slice.height })
})

test('capture payload refuses stale requests, a changed URL, malformed framing and incomplete images', () => {
  expect(() => readBrowserCapture(packet(), crypto.randomUUID(), url)).toThrow('expired')
  expect(() => readBrowserCapture(packet(), requestId, url + 'next')).toThrow('expired')
  expect(() => readBrowserCapture([1, 2], requestId, url)).toThrow('payload')
  const broken = packet()
  new DataView(broken).setUint32(0, 500000, true)
  expect(() => readBrowserCapture(broken, requestId, url)).toThrow('manifest')
  expect(() => readBrowserCapture(packet(manifest, [png.slice(0, -1)]), requestId, url)).toThrow(
    'truncated'
  )
  expect(() => readBrowserCapture(packet(manifest, [png, png]), requestId, url)).toThrow(
    'unexpected'
  )
  expect(() =>
    readBrowserCapture(
      packet({ ...manifest, slices: [{ ...slice, width: 20000 }] }),
      requestId,
      url
    )
  ).toThrow('dimensions')
  expect(() => readBrowserCapture(packet({ ...manifest, slices: [] }, []), requestId, url)).toThrow(
    'invalid'
  )
})
