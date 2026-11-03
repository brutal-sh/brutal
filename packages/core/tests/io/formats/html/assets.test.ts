import { expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { IORegistry, penFormat } from '@open-pencil/core/io'

import { renderNodesToHTML } from '#core/io/formats/html'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
)

test('HTML path modes retain loaded image sources without generating a bundle', async () => {
  const { graph } = await new IORegistry([penFormat]).readDocument({
    name: 'card.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'photo',
            type: 'rectangle',
            width: 40,
            height: 20,
            fill: { type: 'image', url: './images/check #1.png' },
            stroke: { thickness: 1, fill: { type: 'image', url: './images/stroke.png' } }
          }
        ]
      })
    ),
    readAsset: async () => PNG
  })
  const options = { html: 'standalone', documentPath: '/design%20folder/card.pen' } as const
  const relative = await renderNodesToHTML(graph, ['photo'], { ...options, assets: 'relative' })
  expect(relative.html).toContain('src="images/check%20%231.png"')
  expect(relative.assets).toEqual([])
  const absolute = await renderNodesToHTML(graph, ['photo'], { ...options, assets: 'absolute' })
  expect(absolute.html).toContain('src="file:///design%2520folder/images/check%20%231.png"')
  expect(absolute.assets).toEqual([])
  const embedded = await renderNodesToHTML(graph, ['photo'], { ...options, assets: 'inline' })
  expect(embedded.html).toContain('src="data:image/png;base64,')
  expect(embedded.assets).toEqual([])
  const photo = graph.getNode('photo')
  if (!photo) throw new Error('Missing photo')
  const original = photo.fills[0]
  if (!original) throw new Error('Missing fill')
  expect(original.imageSource?.url).toBe('./images/check #1.png')
  expect(photo.strokes[0]?.imageSource?.url).toBe('./images/stroke.png')
  for (const documentPath of [
    undefined,
    'relative/card.pen',
    'https://example.com/card.pen',
    '//remote/card.pen'
  ]) {
    expect(
      (await renderNodesToHTML(graph, ['photo'], { assets: 'absolute', documentPath })).html
    ).toContain('src="data:image/png;base64,')
  }
  const hash = photo.fills[0]?.imageHash
  if (!hash) throw new Error('Missing loaded image hash')
  for (const url of ['../private.png', '/private.png', 'https://example.com/private.png']) {
    graph.updateNode(photo.id, { fills: [{ ...original, imageSource: { hash, url } }] })
    expect((await renderNodesToHTML(graph, ['photo'], { assets: 'relative' })).html).toContain(
      'src="data:image/png;base64,'
    )
  }
  graph.updateNode(photo.id, { fills: [original] })
  graph.updateNode(photo.id, {
    fills: photo.fills.map((fill) => ({ ...fill, imageHash: 'changed' }))
  })
  expect(
    (await renderNodesToHTML(graph, ['photo'], { ...options, assets: 'relative' })).html
  ).not.toContain('check%20%231.png')
})

test('same-byte image sources follow paint removal and reordering', async () => {
  const { graph } = await new IORegistry([penFormat]).readDocument({
    name: 'card.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'photo',
            type: 'rectangle',
            width: 40,
            height: 20,
            fill: [
              { type: 'image', url: 'images/a.png' },
              { type: 'image', url: 'images/b.png' }
            ]
          }
        ]
      })
    ),
    readAsset: async () => PNG
  })
  const node = graph.getNode('photo')
  if (!node) throw new Error('Missing photo')
  graph.updateNode(node.id, { fills: [...node.fills].reverse() })
  expect((await renderNodesToHTML(graph, [node.id], { assets: 'relative' })).html).toContain(
    'src="images/b.png"'
  )
  graph.updateNode(node.id, { fills: node.fills.slice(1) })
  expect((await renderNodesToHTML(graph, [node.id], { assets: 'relative' })).html).toContain(
    'src="images/a.png"'
  )
})
