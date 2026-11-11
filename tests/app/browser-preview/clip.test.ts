import { expect, test } from 'bun:test'

import { clipBrowserPage } from '@/app/browser-preview/clip'
import { extractedPageToGraph } from '@/app/browser-preview/dom/convert'

import { extractedFixture } from '#tests/helpers/browser-preview/extracted-page'

test('clipped imports retain independently editable descendants beyond the root edge', () => {
  const page = extractedFixture()
  const original = structuredClone(page)
  const clipped = clipBrowserPage(page, 50)
  const { graph, root } = extractedPageToGraph(clipped)
  expect(root).toMatchObject({ width: 800, height: 50, clipsContent: true })
  expect([...graph.nodes.values()].find((node) => node.name === 'section')).toMatchObject({
    x: 24,
    y: 30,
    width: 320,
    height: 100
  })
  expect([...graph.nodes.values()].find((node) => node.type === 'TEXT')).toMatchObject({
    text: 'Editable heading',
    fontSize: 20
  })
  expect(clipped.nodes).toBe(page.nodes)
  expect(page).toEqual(original)
})

test.each([undefined, 600, 900])('full-height requests retain the measured page (%s)', (height) => {
  const page = extractedFixture()
  expect(clipBrowserPage(page, height)).toBe(page)
})

test.each([0, -1, Number.NaN, Infinity, -Infinity])(
  'invalid clip heights do not change the extraction (%s)',
  (height) => {
    const page = extractedFixture()
    const original = structuredClone(page)
    expect(() => clipBrowserPage(page, height)).toThrow('positive, finite')
    expect(page).toEqual(original)
  }
)
