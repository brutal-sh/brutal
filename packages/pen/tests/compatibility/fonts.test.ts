import { expect, test } from 'bun:test'

import {
  buildPenGraph,
  inspectPenCompatibility,
  parsePenDocument,
  PenImportError,
  type PenDocument
} from '@open-pencil/pen'

const font = {
  name: 'Fixture Relative Inter',
  url: './fonts/inter.ttf',
  weight: [100, 900],
  axes: [{ tag: 'wght', start: 100, end: 900 }]
}

for (const fonts of [[font], [{}], null, {}, 'font.ttf', 400]) {
  test(`custom-font file preflight refuses unsupported declaration ${JSON.stringify(fonts)}`, () => {
    const doc: PenDocument = { version: '2.22', fonts, children: [] }
    expect(inspectPenCompatibility(doc).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: 'unsupported-font', path: '/fonts' }
    ])
    expect(() => buildPenGraph(doc)).toThrow(PenImportError)
  })
}

test('custom-font file refusal keeps source and schema-only inspection intact before layout', () => {
  const doc: PenDocument = { version: '2.22', fonts: [font], children: [] }
  const original = structuredClone(doc)
  let layouts = 0
  expect(() =>
    buildPenGraph(doc, {
      layout: () => {
        layouts++
      }
    })
  ).toThrow(PenImportError)
  expect(layouts).toBe(0)
  expect(doc).toEqual(original)
  expect(parsePenDocument(JSON.stringify(doc))).toEqual(original)
})

for (const [name, fonts] of [
  ['absent', undefined],
  ['empty', []]
] as const) {
  test(`empty custom-font definitions retain ordinary system-font text: ${name}`, () => {
    const doc: PenDocument = {
      version: '2.22',
      fonts,
      children: [{ id: 'text', type: 'text', content: 'Retained system font', fontFamily: 'Inter' }]
    }
    expect(inspectPenCompatibility(doc)).toEqual([])
    expect(buildPenGraph(doc).getNode('text')?.fontFamily).toBe('Inter')
  })
}
