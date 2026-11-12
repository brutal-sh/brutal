import { expect, test } from 'bun:test'

import { IORegistry, penFormat } from '@open-pencil/core/io'

const font = { name: 'Fixture Relative Inter', url: './font.ttf', weight: 400 }

test('public Pen IO refuses custom-font loss before loading external assets and keeps source bytes', async () => {
  const data = new TextEncoder().encode(
    JSON.stringify({
      version: '2.22',
      fonts: [font],
      children: [
        {
          id: 'image',
          type: 'rectangle',
          width: 64,
          height: 32,
          fill: { type: 'image', url: './image.png' }
        }
      ]
    })
  )
  const original = data.slice()
  let reads = 0
  await expect(
    new IORegistry([penFormat]).readDocument({
      name: 'custom-font.pen',
      data,
      readAsset: () => {
        reads++
        return Promise.resolve(null)
      }
    })
  ).rejects.toMatchObject({
    code: 'pen-import-loss',
    diagnostics: [expect.objectContaining({ code: 'unsupported-font', path: '/fonts' })]
  })
  expect(reads).toBe(0)
  expect(data).toEqual(original)
})

test('public Pen IO accepts an empty custom-font list without changing ordinary geometry', async () => {
  const loaded = await new IORegistry([penFormat]).readDocument({
    name: 'empty-fonts.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.22',
        fonts: [],
        children: [{ id: 'box', type: 'rectangle', width: 64, height: 32 }]
      })
    )
  })
  expect(loaded.graph.getNode('box')).toMatchObject({ type: 'RECTANGLE', width: 64, height: 32 })
})
