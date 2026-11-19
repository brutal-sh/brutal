import { describe, expect, test } from 'bun:test'

import { strToU8, unzipSync, zipSync } from 'fflate'
import { toUint8Array } from 'js-base64'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const frame = { x: 8, y: 12, width: 80, height: 40 }
const red = { red: 1, green: 0, blue: 0, alpha: 1 }

function archive(layers: unknown[], secondPage = false) {
  const page = (name: string, children: unknown[]) =>
    strToU8(JSON.stringify({ _class: 'page', name, layers: children }))
  const pages = [{ _ref: 'pages/first' }]
  if (secondPage) pages.push({ _ref: 'pages/second.json' })
  return zipSync({
    'document.json': strToU8(JSON.stringify({ pages })),
    'pages/first.json': page('Draft', layers),
    'pages/second.json': page('Second page', [])
  })
}

describe('Sketch document import through the format registry', () => {
  test('preserves supported layers and opens the saved FIG as an independent editable document', async () => {
    const data = archive(
      [
        {
          _class: 'artboard',
          name: 'Native proof',
          frame,
          layers: [
            {
              _class: 'rectangle',
              name: 'Editable box',
              frame,
              fixedRadius: 5,
              style: { fills: [{ fillType: 0, color: red }] }
            },
            { _class: 'oval', name: 'Hidden oval', frame, isVisible: false, rotation: 15 },
            {
              _class: 'text',
              name: 'Editable title',
              frame,
              attributedString: { string: 'Sketch proof' }
            }
          ]
        }
      ],
      true
    )
    const source = data.slice()
    const result = await io.readDocument({ name: 'Artwork.SKETCH', data })
    expect(result.sourceFormat).toBe('sketch')
    expect(result.importWarnings).toEqual([])
    const { graph } = result
    expect(graph.getPages().map((page) => page.name)).toEqual(['Draft', 'Second page'])
    const [artboard] = graph.getChildren(graph.getPages()[0].id)
    expect(artboard).toMatchObject({ type: 'FRAME', name: 'Native proof', clipsContent: true })
    const [box, oval, title] = graph.getChildren(artboard.id)
    expect(box).toMatchObject({
      type: 'RECTANGLE',
      name: 'Editable box',
      cornerRadius: 5,
      ...frame,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }]
    })
    expect(oval).toMatchObject({ type: 'ELLIPSE', visible: false, rotation: -15 })
    expect(title).toMatchObject({ type: 'TEXT', text: 'Sketch proof' })
    graph.updateNode(box.id, { name: 'Edited box' })
    const copy = await io.writeDocument('fig', graph)
    if (typeof copy.data === 'string') throw new Error('Expected a binary FIG copy')
    const { graph: reopened } = await io.readDocument({ name: 'Copy.fig', data: copy.data })
    expect(
      reopened.getChildren(reopened.getChildren(reopened.getPages()[0].id)[0].id)[0].name
    ).toBe('Edited box')
    expect(data).toEqual(source)
  })

  test('reports omitted effects and layers without exposing the contents of a masked group', async () => {
    const data = archive([
      { _class: 'rectangle', name: 'Mask', frame, hasClippingMask: true },
      { _class: 'rectangle', name: 'Masked content', frame },
      {
        _class: 'rectangle',
        name: 'Visible',
        frame,
        shouldBreakMaskChain: true,
        style: { shadows: [{ isEnabled: true }] }
      },
      { _class: 'symbolInstance', name: 'Repeated element', frame }
    ])
    const { graph, importWarnings } = await io.readDocument({ name: 'Masked.sketch', data })
    expect(graph.getChildren(graph.getPages()[0].id).map((node) => node.name)).toEqual(['Visible'])
    expect(importWarnings).toEqual([
      'clipping masks and masked layers',
      'effects and blend modes',
      'unsupported layer types'
    ])
  })

  test('reuses one embedded image across layers and reports missing assets', async () => {
    const layer = { _class: 'bitmap', name: 'Bitmap', frame, image: { _ref: 'images/owned.png' } }
    const files = unzipSync(
      archive([layer, layer, { ...layer, image: { _ref: 'images/missing.png' } }])
    )
    files['images/owned.png'] = new Uint8Array(
      toUint8Array(
        'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
      )
    )
    const { graph, importWarnings } = await io.readDocument({
      name: 'Image.sketch',
      data: zipSync(files)
    })
    const layers = graph.getChildren(graph.getPages()[0].id)
    expect(layers).toHaveLength(2)
    expect(layers[0].fills[0].imageHash).toBe(layers[1].fills[0].imageHash)
    expect(layers[0].fills).not.toBe(layers[1].fills)
    expect(graph.images.size).toBe(1)
    expect(importWarnings).toEqual(['missing or unsupported images'])
  })

  test('rejects missing pages, invalid archives, oversized metadata, and unsupported-only documents', async () => {
    const missing = zipSync({
      'document.json': strToU8(JSON.stringify({ pages: [{ _ref: 'pages/missing' }] }))
    })
    await expect(io.readDocument({ name: 'Missing.sketch', data: missing })).rejects.toThrow(
      'missing pages/missing.json'
    )
    await expect(
      io.readDocument({ name: 'Broken.sketch', data: new Uint8Array([80, 75]) })
    ).rejects.toThrow('ZIP archive')
    const oversized = zipSync({ 'document.json': new Uint8Array(16 * 1024 * 1024 + 1) })
    await expect(io.readDocument({ name: 'Large.sketch', data: oversized })).rejects.toThrow(
      'size limit'
    )
    const unsupported = archive([{ _class: 'symbolInstance', name: 'Only layer', frame }])
    await expect(
      io.readDocument({ name: 'Unsupported.sketch', data: unsupported })
    ).rejects.toThrow('no supported layers')
  })
})
