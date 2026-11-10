import { expect, test } from 'bun:test'

import { parsePenFile, writePenDocument, type PenDocument } from '@open-pencil/pen'

for (const value of ['fill_container', 'fill_container(200)', 'fill_container(420.5)']) {
  test(`Note Fill ${value} retains its exact authored fallback through repeated saves`, () => {
    let document: PenDocument = {
      version: '2.22',
      children: [
        {
          id: 'note',
          type: 'note',
          content: 'Keep this',
          width: value,
          height: 'fill_container(550)'
        }
      ]
    }
    for (let round = 0; round < 3; round++) {
      const output = writePenDocument(parsePenFile(JSON.stringify(document)))
      expect(output.children[0]).toMatchObject(document.children[0])
      expect(output.children[0].children).toBeUndefined()
      document = output
    }
  })
}

test('Fill overrides on a Note ref retain their sizing without changing the reusable master', () => {
  const document: PenDocument = {
    version: '2.22',
    children: [
      { id: 'master', type: 'note', reusable: true, width: 300, height: 219, content: 'Keep this' },
      {
        id: 'ref',
        type: 'ref',
        ref: 'master',
        width: 'fill_container(200)',
        height: 'fill_container(550)'
      }
    ]
  }
  const output = writePenDocument(parsePenFile(JSON.stringify(document)))
  expect(output.children[0]).toMatchObject(document.children[0])
  expect(output.children[1]).toMatchObject(document.children[1])
  expect(writePenDocument(parsePenFile(JSON.stringify(output))).children).toEqual(output.children)
})

test.each([
  'fit_content',
  'hug_content(300)',
  '$size',
  '300',
  '50%',
  'fill_container()',
  'fill_container(nope)',
  'fill_container(1e400)'
])('unqualified Note sizing remains an import refusal: %s', (value) => {
  expect(() =>
    parsePenFile(
      JSON.stringify({
        version: '2.22',
        children: [{ id: 'note', type: 'note', width: value, content: 'Keep this' }]
      })
    )
  ).toThrow(/Note width/)
})
