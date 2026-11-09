import { expect, test } from 'bun:test'

import { parsePenFile, PenImportError } from '@open-pencil/pen'

for (const override of [
  { fill: '#FF0000' },
  { cornerRadius: 4 },
  { children: [] },
  { content: '$unqualified' },
  { width: 'fill_container' },
  { color: 'unparseable-color' }
]) {
  test(`typed Note ref replacements refuse unqualified overrides: ${JSON.stringify(override)}`, () => {
    expect(() =>
      parsePenFile(
        JSON.stringify({
          version: '2.22',
          children: [
            { id: 'noteMaster', type: 'note', reusable: true, content: 'Keep this' },
            {
              id: 'frame',
              type: 'frame',
              reusable: true,
              children: [{ id: 'target', type: 'rectangle' }]
            },
            {
              id: 'instance',
              type: 'ref',
              ref: 'frame',
              descendants: { target: { type: 'ref', ref: 'noteMaster', ...override } }
            }
          ]
        })
      )
    ).toThrow(PenImportError)
  })
  test(`direct Note refs refuse unqualified overrides before building: ${JSON.stringify(override)}`, () => {
    expect(() =>
      parsePenFile(
        JSON.stringify({
          version: '2.22',
          children: [
            { id: 'master', type: 'note', reusable: true, content: 'Keep this' },
            { id: 'instance', type: 'ref', ref: 'master', ...override }
          ]
        })
      )
    ).toThrow(PenImportError)
  })
  test(`nested Note refs refuse unqualified overrides before building: ${JSON.stringify(override)}`, () => {
    expect(() =>
      parsePenFile(
        JSON.stringify({
          version: '2.22',
          children: [
            {
              id: 'master',
              type: 'frame',
              reusable: true,
              children: [{ id: 'note', type: 'note', content: 'Keep this' }]
            },
            { id: 'instance', type: 'ref', ref: 'master', descendants: { note: override } }
          ]
        })
      )
    ).toThrow(PenImportError)
  })
}

test('recursive frame-ref replacements validate their nested Note overrides before import', () => {
  expect(() =>
    parsePenFile(
      JSON.stringify({
        version: '2.22',
        children: [
          {
            id: 'b',
            type: 'frame',
            reusable: true,
            children: [{ id: 'n', type: 'note', content: 'Keep' }]
          },
          {
            id: 'a',
            type: 'frame',
            reusable: true,
            children: [{ id: 'target', type: 'rectangle' }]
          },
          {
            id: 'outer',
            type: 'ref',
            ref: 'a',
            descendants: {
              target: { type: 'ref', ref: 'b', descendants: { n: { fill: '#FF0000' } } }
            }
          }
        ]
      })
    )
  ).toThrow(PenImportError)
})

test('reusable Note refs refuse before losing their reusable identity', () => {
  expect(() =>
    parsePenFile(
      JSON.stringify({
        version: '2.22',
        children: [
          { id: 'm', type: 'note', reusable: true, content: 'Master' },
          { id: 'promoted', type: 'ref', ref: 'm', reusable: true, content: 'Reusable ref' }
        ]
      })
    )
  ).toThrow(PenImportError)
})
