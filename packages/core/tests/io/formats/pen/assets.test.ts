import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { fromUint8Array, toUint8Array } from 'js-base64'

import { createEditor } from '@open-pencil/core'
import type { IconData, IconProvider } from '@open-pencil/core/icons'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import type { PenNode } from '@open-pencil/pen'
import type { Fill } from '@open-pencil/scene-graph'
import { applyGradientTransform } from '@open-pencil/scene-graph/gradient'
import {
  iconDrawing,
  isIconModified,
  readIcon,
  type IconOptions
} from '@open-pencil/scene-graph/icons'
import { parseSVGPath } from '@open-pencil/scene-graph/parse-path'

// A 2 × 1 PNG.
const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
)

interface IconRequest {
  names: string[]
  options?: IconOptions
}

interface IconPaintCase {
  name: string
  fill: PenNode['fill']
  expected: Partial<Fill>[]
}

function iconProvider(available: string[], requested: IconRequest[]): IconProvider {
  const glyph = (name: string, size: number, options?: IconOptions): IconData => {
    const [prefix = '', iconName = ''] = name.split(':')
    return {
      prefix,
      name: iconName,
      width: size,
      height: size,
      paths: [
        {
          vectorNetwork: parseSVGPath(`M0 0H${size}V${size}Z`),
          fill: 'currentColor',
          stroke: null,
          strokeWidth: 0,
          strokeCap: 'butt',
          strokeJoin: 'miter'
        }
      ],
      ...(options ? { options } : {})
    }
  }
  return {
    async icons(names, size, options) {
      requested.push(options ? { names: [...names], options } : { names: [...names] })
      return new Map(
        names
          .filter((name) => available.includes(name))
          .map((name) => [name, glyph(name, size, options)])
      )
    },
    search: () => Promise.resolve({ icons: [], total: 0, collections: {} }),
    previews: () => Promise.resolve(new Map()),
    collections: () => Promise.resolve([]),
    browse: () => Promise.resolve([])
  }
}

const io = new IORegistry([penFormat])

function penBytes(children: unknown[]) {
  return new TextEncoder().encode(JSON.stringify({ version: '2.21', children }))
}

describe('penFormat.readDocument — assets', () => {
  test.each([
    { name: 'missing', fill: undefined, expected: [] },
    { name: 'empty', fill: [], expected: [] },
    {
      name: 'disabled',
      fill: { type: 'color', color: '#FFFFFF', enabled: false },
      expected: [{ type: 'SOLID', visible: false }]
    },
    {
      name: 'alpha',
      fill: '#FFFFFF80',
      expected: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 128 / 255 }, opacity: 128 / 255 }]
    },
    {
      name: 'multiple',
      fill: ['#FF0000', '#0000FF80'],
      expected: [
        { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } },
        { type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 128 / 255 }, opacity: 128 / 255 }
      ]
    },
    {
      name: 'wide gradient',
      fill: {
        type: 'gradient',
        gradientType: 'linear',
        rotation: 270,
        opacity: 0.8,
        colors: [
          { color: '#FF0000', position: 0 },
          { color: '#0000FF', position: 1 }
        ]
      },
      expected: [{ type: 'GRADIENT_LINEAR', opacity: 0.8 }]
    }
  ] satisfies IconPaintCase[])(
    'keeps $name icon paint on tinted fills and strokes',
    async ({ fill, expected, name }: IconPaintCase) => {
      const provider = iconProvider(['lucide:heart'], [])
      const sourceIcons = provider.icons
      provider.icons = async (...args) => {
        const result = await sourceIcons(...args)
        for (const icon of result.values()) {
          const [path] = icon.paths
          if (!path) throw new Error('Fixture glyph missing')
          icon.paths = [
            { ...path, fillOpacity: 0.5 },
            {
              ...path,
              fill: null,
              stroke: 'currentColor',
              strokeWidth: 2,
              strokeCap: 'round',
              strokeJoin: 'round'
            }
          ]
        }
        return result
      }
      const { graph } = await io.readDocument(
        {
          name: 'icon-paints.pen',
          data: penBytes([
            {
              id: 'painted',
              type: 'icon',
              library: 'lucide',
              icon: 'heart',
              width: 48,
              height: 24,
              fill
            }
          ])
        },
        { icons: provider }
      )
      const frame = getNodeOrThrow(graph, 'painted')
      const [filled, stroked] = graph.getChildren(frame.id)
      expect(frame.fills).toHaveLength(expected.length)
      expect(filled.fills).toHaveLength(expected.length)
      expect(stroked.strokes).toHaveLength(expected.length)
      for (const [index, paint] of expected.entries()) {
        expect(filled.fills[index]).toMatchObject({ ...paint, opacity: (paint.opacity ?? 1) * 0.5 })
        expect(stroked.strokes[index]).toMatchObject({ ...paint, weight: 2 })
        expect(filled.fills[index].color).not.toBe(stroked.strokes[index].color)
      }
      expect(isIconModified(graph, frame)).toBe(false)
      const baseline = readIcon(frame)?.drawing
      if (!baseline) throw new Error('Icon drawing baseline missing')
      expect(iconDrawing(graph, frame)).toEqual(baseline)
      expect(filled.x).toBe(12)
      if (name === 'wide gradient') {
        const transform = filled.fills[0].gradientTransform
        if (!transform) throw new Error('Gradient transform missing')
        expect(applyGradientTransform(transform, { x: 0, y: 0.5 }).x).toBeCloseTo(0.25)
        expect(applyGradientTransform(transform, { x: 1, y: 0.5 }).x).toBeCloseTo(0.75)
      }
    }
  )

  test('a loaded named icon stays editable through recolor, save and reopen', async () => {
    const provider = iconProvider(['lucide:heart'], [])
    const { graph } = await io.readDocument(
      {
        name: 'icon.pen',
        data: penBytes([
          {
            id: 'glyph',
            type: 'icon',
            name: 'Icon',
            library: 'lucide',
            icon: 'heart',
            x: 12.5,
            y: 33.25,
            width: 24,
            height: 24,
            fill: '#FFFFFF'
          }
        ])
      },
      { icons: provider }
    )
    const frame = getNodeOrThrow(graph, 'glyph')
    expect(readIcon(frame)?.drawing).toEqual(expect.any(String))
    const editor = createEditor({ graph, icons: provider })
    try {
      editor.setIconColor(frame.id, { r: 1, g: 0, b: 0, a: 1 })
      const saved = await io.writeDocument('pen', graph)
      const reopened = await io.readDocument(
        {
          name: 'reopened-icon.pen',
          data: typeof saved.data === 'string' ? new TextEncoder().encode(saved.data) : saved.data
        },
        { icons: provider }
      )
      const after = getNodeOrThrow(reopened.graph, frame.id)
      expect(after).toMatchObject({ name: 'Icon', x: 12.5, y: 33.25, width: 24, height: 24 })
      expect(readIcon(after)).toMatchObject({ name: 'lucide:heart', drawing: expect.any(String) })
      expect(reopened.graph.getChildren(after.id)[0]?.fills[0]?.color).toEqual({
        r: 1,
        g: 0,
        b: 0,
        a: 1
      })
      await io.writeDocument('pen', reopened.graph)
    } finally {
      editor.dispose()
    }
  })

  test('reads and reopens an object image stroke without losing its image bytes', async () => {
    const asked: string[] = []
    const { graph } = await io.readDocument({
      name: 'stroke.pen',
      data: penBytes([
        {
          id: 'line',
          type: 'line',
          width: 80,
          height: 0,
          stroke: {
            thickness: 3,
            fill: { type: 'image', url: './stroke.png' }
          }
        }
      ]),
      readAsset: async (path) => {
        asked.push(path)
        return PNG
      }
    })
    expect(asked).toEqual(['./stroke.png'])
    const first = getNodeOrThrow(graph, 'line').strokes[0]
    expect(first.type).toBe('IMAGE')
    const saved = await io.writeDocument('pen', graph)
    const reopened = await io.readDocument({
      name: 'reopened.pen',
      data: typeof saved.data === 'string' ? new TextEncoder().encode(saved.data) : saved.data
    })
    const stroke = getNodeOrThrow(reopened.graph, 'line').strokes[0]
    expect(stroke.dashPattern).toEqual([])
    expect(reopened.graph.images.get(stroke.imageHash ?? '')).toEqual(PNG)
  })
  test('draws every library from its set, Material Symbols at their weight', async () => {
    const requested: IconRequest[] = []
    const icons = iconProvider(['lucide:house', 'material-symbols-outlined:home'], requested)
    const { graph } = await io.readDocument(
      {
        name: 'icons.pen',
        data: penBytes([
          { id: 'house', type: 'icon', library: 'lucide', icon: 'house', width: 48, height: 48 },
          {
            id: 'symbol',
            type: 'icon',
            library: 'Material Symbols Outlined',
            icon: 'home',
            weight: 650,
            width: 48,
            height: 48
          }
        ])
      },
      { icons }
    )
    expect(requested).toEqual(
      expect.arrayContaining([
        { names: ['lucide:house'] },
        { names: ['material-symbols-outlined:home'], options: { wght: 650 } }
      ])
    )
    expect(readIcon(getNodeOrThrow(graph, 'house'))).toMatchObject({ name: 'lucide:house' })
    expect(readIcon(getNodeOrThrow(graph, 'symbol'))).toMatchObject({
      name: 'material-symbols-outlined:home',
      options: { wght: 650 }
    })
    expect(graph.getChildren('symbol').map((glyph) => glyph.type)).toEqual(['VECTOR'])
  })

  test('reads image files through the host and leaves unreadable ones unpainted', async () => {
    const asked: string[] = []
    const { graph } = await io.readDocument(
      {
        name: 'images.pen',
        data: penBytes([
          {
            id: 'photo',
            type: 'rectangle',
            width: 20,
            height: 10,
            fill: { type: 'image', url: './photo.png' }
          },
          {
            id: 'gone',
            type: 'rectangle',
            width: 20,
            height: 10,
            fill: { type: 'image', url: './gone.png' }
          }
        ]),
        readAsset: async (path) => {
          asked.push(path)
          return path === './photo.png' ? PNG : null
        }
      },
      { icons: iconProvider([], []) }
    )
    expect([...asked].sort()).toEqual(['./gone.png', './photo.png'])
    expect(graph.getNode('photo')?.fills[0]?.type).toBe('IMAGE')
    expect(graph.getNode('gone')?.fills).toEqual([])
  })

  test('decodes data URLs as URLs, without the host', async () => {
    const encoded = fromUint8Array(PNG)
    const { graph } = await io.readDocument(
      {
        name: 'inline.pen',
        data: penBytes([
          {
            id: 'plain',
            type: 'rectangle',
            fill: { type: 'image', url: `data:image/png;base64,${encoded}` }
          },
          {
            id: 'named',
            type: 'rectangle',
            fill: { type: 'image', url: `DATA:image/png;name=a.png;base64,${encoded}` }
          },
          {
            id: 'broken',
            type: 'rectangle',
            fill: { type: 'image', url: 'data:image/png;base64,!!!' }
          }
        ])
      },
      { icons: iconProvider([], []) }
    )
    expect(graph.getNode('plain')?.fills[0]?.type).toBe('IMAGE')
    expect(graph.getNode('named')?.fills[0]?.type).toBe('IMAGE')
    expect(graph.getNode('broken')?.fills).toEqual([])
  })
})
