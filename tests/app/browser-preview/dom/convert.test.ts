import { expect, test } from 'bun:test'

import { extractedPageToGraph } from '@/app/browser-preview/dom/convert'
import { validateExtractedPage } from '@/app/browser-preview/dom/schema'

import { extractedFixture } from '#tests/helpers/browser-preview/extracted-page'

test('local export imports require exact explicit URL authorization and request identity', () => {
  const url = 'file:///design/owned-export.html'
  const page = { ...extractedFixture(), url }
  expect(() => validateExtractedPage(page, page.requestId, url)).toThrow()
  expect(validateExtractedPage(page, page.requestId, url, url).url).toBe(url)
  expect(() =>
    validateExtractedPage({ ...page, url: 'file:///design/another.html' }, page.requestId, url, url)
  ).toThrow()
  expect(() => validateExtractedPage(page, crypto.randomUUID(), url, url)).toThrow('expired')
})

test('measured nested page becomes independently editable text and frames at recorded positions', () => {
  const page = extractedFixture()
  const { graph, root } = extractedPageToGraph(
    validateExtractedPage(page, page.requestId, page.url)
  )
  expect(root).toMatchObject({ name: 'Imported page', width: 800, height: 600, layoutMode: 'NONE' })
  const section = [...graph.nodes.values()].find((node) => node.name === 'section')
  expect(section).toMatchObject({ x: 24, y: 30, width: 320, height: 100 })
  const text = [...graph.nodes.values()].find((node) => node.type === 'TEXT')
  expect(text).toMatchObject({
    text: 'Editable heading',
    x: 0,
    y: 0,
    width: 200,
    height: 24,
    fontSize: 20
  })
  const wrapper = graph.getNode(text?.parentId ?? '')
  expect(wrapper).toMatchObject({ x: 16, y: 16, parentId: section?.id })
  expect(section?.fills[0].type).toBe('SOLID')
})

test('rejects stale responses, missing parents, malformed dimensions and explicit unsupported content', () => {
  const fixture = extractedFixture()
  const validate = (value: unknown) => validateExtractedPage(value, fixture.requestId, fixture.url)
  expect(() => validate({ ...fixture, requestId: crypto.randomUUID() })).toThrow('expired')
  expect(() => validate({ ...fixture, width: Infinity })).toThrow('invalid')
  const badParent = extractedFixture()
  badParent.nodes[1].parentId = 'node-99'
  expect(() => validate(badParent)).toThrow('hierarchy')
  expect(() =>
    validate({
      ...fixture,
      diagnostics: [{ path: 'body/iframe[0]', message: 'Unsupported frame' }]
    })
  ).toThrow('body/iframe[0]')
  const image = extractedFixture()
  image.nodes[1].tag = 'img'
  expect(() => validate(image)).toThrow('image pixels are missing')
  image.nodes[1].image = 'data:image/png;base64,SGVsbG8='
  expect(() => validate(image)).toThrow('not PNG')
})
