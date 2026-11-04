import { expect, test } from 'bun:test'
import { join } from 'node:path'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { FIXTURES } from '#core-tests/helpers/paths'

import { createEditor } from '@open-pencil/core'
import { createMaterialSymbolsProvider } from '@open-pencil/core/icons'
import { IORegistry, penFormat } from '@open-pencil/core/io'
import { exportFigFile, parseFigFile } from '@open-pencil/core/io/formats/fig'
import { PenExportError, parsePenDocument } from '@open-pencil/pen'
import { iconDrawing, readIcon } from '@open-pencil/scene-graph/icons'
import { syncInstance } from '@open-pencil/scene-graph/instances'
import { OPEN_PENCIL_PLUGIN_DATA, readPluginData } from '@open-pencil/scene-graph/plugin-data'

async function materialProvider() {
  const font = await Bun.file(
    join(FIXTURES, 'fonts', 'MaterialSymbolsRounded-home-dark_mode.ttf')
  ).arrayBuffer()
  return createMaterialSymbolsProvider(
    Object.assign(
      async (input: string | URL | Request) => {
        const url = new URL(String(input))
        return url.hostname === 'fonts.googleapis.com'
          ? new Response(
              '@font-face { src: url(https://fonts.gstatic.com/owned-fixture.ttf) format("truetype"); }'
            )
          : new Response(font)
      },
      { preconnect: fetch.preconnect }
    )
  )
}

test('Material named export reopens the actual font outline, weight, source size and paint', async () => {
  const icons = await materialProvider()
  const io = new IORegistry([penFormat])
  for (const size of [16, 24, 40, 64, 96.5]) {
    for (const weight of [100, 200, 700]) {
      const source = {
        version: '2.21',
        children: [
          {
            id: 'icon',
            type: 'icon',
            library: 'Material Symbols Rounded',
            icon: 'home',
            width: size,
            height: size,
            weight: 200,
            fill: '#1288AA80'
          }
        ]
      }
      const first = await io.readDocument(
        { name: 'source.pen', data: new TextEncoder().encode(JSON.stringify(source)) },
        { icons }
      )
      const editor = createEditor({ graph: first.graph, icons })
      try {
        await editor.setIconOptions('icon', { wght: weight })
      } finally {
        editor.dispose()
      }
      const before = first.graph
        .getChildren('icon')
        .map(({ vectorNetwork, fills, strokes }) => ({ vectorNetwork, fills, strokes }))
      expect(before.length).toBeGreaterThan(0)
      const exported = await io.exportContent('pen', {
        graph: first.graph,
        target: { scope: 'document' }
      })
      if (typeof exported.data !== 'string') throw new Error('Expected .pen text')
      expect(parsePenDocument(exported.data).children[0]).toMatchObject({
        type: 'icon',
        library: 'Material Symbols Rounded',
        icon: 'home',
        width: size,
        height: size,
        weight
      })
      const second = await io.readDocument(
        { name: 'reopened.pen', data: new TextEncoder().encode(exported.data) },
        { icons }
      )
      expect(readIcon(getNodeOrThrow(second.graph, 'icon'))?.options?.wght).toBe(weight)
      expect(
        second.graph
          .getChildren('icon')
          .map(({ vectorNetwork, fills, strokes }) => ({ vectorNetwork, fills, strokes }))
      ).toEqual(before)
    }
  }
})

test('loads the exact descendant weight and keeps identity, artwork and references through sync', async () => {
  const provider = await materialProvider()
  const requests: (number | string | undefined)[] = []
  const icons = {
    ...provider,
    icons: async (...args: Parameters<typeof provider.icons>) => {
      requests.push(args[2]?.wght)
      return provider.icons(...args)
    }
  }
  const io = new IORegistry([penFormat])
  const source = {
    version: '2.21',
    variables: { weight: { type: 'number', value: 700 } },
    children: [
      {
        id: 'main',
        type: 'frame',
        reusable: true,
        width: 100,
        height: 100,
        children: [
          {
            id: 'glyph',
            type: 'icon',
            library: 'Material Symbols Rounded',
            icon: 'home',
            weight: 200,
            width: 64,
            height: 64,
            fill: '#FFFFFF'
          }
        ]
      },
      { id: 'instance', type: 'ref', ref: 'main', descendants: { glyph: { weight: '$weight' } } }
    ]
  }
  const { graph } = await io.readDocument(
    { name: 'nested.pen', data: new TextEncoder().encode(JSON.stringify(source)) },
    { icons }
  )
  const glyph = graph.getChildren('instance').find((node) => readIcon(node))
  if (!glyph) throw new Error('Merged icon missing')
  expect(requests).toEqual([200, 700])
  expect(readIcon(glyph)?.options?.wght).toBe(700)
  const expected = (await provider.icons(['material-symbols-rounded:home'], 64, { wght: 700 })).get(
    'material-symbols-rounded:home'
  )
  if (!expected) throw new Error('Expected actual weighted glyph')
  expect(graph.getChildren(glyph.id).map(({ vectorNetwork }) => vectorNetwork)).toEqual(
    expected.paths.map(({ vectorNetwork }) => vectorNetwork)
  )
  expect(readPluginData(glyph.pluginData, OPEN_PENCIL_PLUGIN_DATA.penIconReferences)).toEqual({
    weight: '$weight'
  })
  syncInstance(graph, 'instance')
  expect(readIcon(getNodeOrThrow(graph, glyph.id))?.options?.wght).toBe(700)
  expect(graph.getChildren(glyph.id).map(({ vectorNetwork }) => vectorNetwork)).toEqual(
    expected.paths.map(({ vectorNetwork }) => vectorNetwork)
  )
  expect(
    readPluginData(
      getNodeOrThrow(graph, glyph.id).pluginData,
      OPEN_PENCIL_PLUGIN_DATA.penIconReferences
    )
  ).toEqual({ weight: '$weight' })
  const reopened = await parseFigFile((await exportFigFile(graph)).slice().buffer)
  const restored = [...reopened.nodes.values()].find(
    (node) =>
      readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.penIconReferences)?.weight ===
      '$weight'
  )
  if (!restored) throw new Error('FIG lost the overridden icon')
  expect(readIcon(restored)?.options?.wght).toBe(700)
  expect(reopened.getChildren(restored.id).length).toBeGreaterThan(0)
  expect(readIcon(restored)?.drawing).toBe(iconDrawing(reopened, restored))
})

test.each([
  [{ library: '$family' }, { library: '$family' }],
  [{ icon: '$glyph' }, { icon: '$glyph' }],
  [{ weight: '$weight' }, { weight: '$weight' }],
  [{ weight: '$missing' }, { weight: '$missing' }],
  [
    { library: '$family', icon: '$glyph', weight: '$weight' },
    { library: '$family', icon: '$glyph', weight: '$weight' }
  ]
])(
  'retains identity references through reset and FIG instead of literalizing them: %j',
  async (fields, references) => {
    const icons = await materialProvider()
    const io = new IORegistry([penFormat])
    const source = {
      version: '2.21',
      variables: {
        family: { type: 'string', value: 'Material Symbols Rounded' },
        glyph: { type: 'string', value: 'home' },
        weight: { type: 'number', value: 700 }
      },
      children: [
        {
          id: 'bound',
          type: 'icon',
          library: 'Material Symbols Rounded',
          icon: 'home',
          weight: 200,
          ...fields,
          width: 64,
          height: 64,
          fill: '#FFFFFF'
        }
      ]
    }
    const { graph } = await io.readDocument(
      { name: 'bound.pen', data: new TextEncoder().encode(JSON.stringify(source)) },
      { icons }
    )
    expect(graph.getChildren('bound').length).toBeGreaterThan(0)
    expect(
      readPluginData(
        getNodeOrThrow(graph, 'bound').pluginData,
        OPEN_PENCIL_PLUGIN_DATA.penIconReferences
      )
    ).toEqual(references)
    await expect(io.writeDocument('pen', graph)).rejects.toBeInstanceOf(PenExportError)
    const editor = createEditor({ graph, icons })
    try {
      await editor.resetIcon('bound')
      expect(
        readPluginData(
          getNodeOrThrow(graph, 'bound').pluginData,
          OPEN_PENCIL_PLUGIN_DATA.penIconReferences
        )
      ).toEqual(references)
      const reopened = await parseFigFile((await exportFigFile(graph)).slice().buffer)
      const retained = [...reopened.nodes.values()].find((node) =>
        readPluginData(node.pluginData, OPEN_PENCIL_PLUGIN_DATA.penIconReferences)
      )
      expect(retained).toBeDefined()
      if (!retained) throw new Error('FIG lost authored icon references')
      expect(
        readPluginData(retained.pluginData, OPEN_PENCIL_PLUGIN_DATA.penIconReferences)
      ).toEqual(references)
      await expect(io.writeDocument('pen', reopened)).rejects.toBeInstanceOf(PenExportError)
    } finally {
      editor.dispose()
    }
  }
)
