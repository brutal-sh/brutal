import { expect, test } from 'bun:test'

import { strFromU8, unzipSync } from 'fflate'

import { createEditor } from '@open-pencil/core'
import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { colorToFill } from '@open-pencil/scene-graph/color'

import { createDocumentExportActions } from '@/app/document/export/create'

test.each([false, true])(
  'SVG selection retains each object in a ZIP (same names: %s)',
  async (sameNames) => {
    const editor = createEditor()
    try {
      const first = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        name: 'First',
        x: 20,
        y: 30,
        width: 80,
        height: 40,
        fills: [colorToFill('#6E56CF')]
      })
      const second = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
        name: sameNames ? 'First' : 'Second',
        x: 300,
        y: 100,
        width: 120,
        height: 60,
        fills: [colorToFill('#20856B')]
      })
      editor.select([first.id, second.id])
      const downloads: Array<{ bytes: Uint8Array; name: string; mime: string }> = []
      const actions = createDocumentExportActions(
        editor,
        editor.state,
        new IORegistry(BUILTIN_IO_FORMATS),
        (bytes, name, mime) => downloads.push({ bytes, name, mime })
      )
      await actions.exportSelection(4, 'svg')
      expect(downloads).toHaveLength(1)
      const download = downloads[0]
      expect(download.name).toBe(sameNames ? 'First.zip' : 'export.zip')
      expect(download.mime).toBe('application/zip')
      const files = unzipSync(download.bytes)
      const secondName = sameNames ? 'First (2).svg' : 'Second.svg'
      expect(Object.keys(files)).toEqual(['First.svg', secondName])
      expect(strFromU8(files['First.svg'])).toContain('viewBox="0 0 80 40"')
      expect(strFromU8(files[secondName])).toContain('viewBox="0 0 120 60"')
      expect([...editor.state.selectedIds]).toEqual([first.id, second.id])
    } finally {
      editor.dispose()
    }
  }
)

test('one selected SVG downloads directly without changing its scale', async () => {
  const editor = createEditor()
  try {
    const node = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, {
      name: 'One',
      width: 80,
      height: 40,
      fills: [colorToFill('#6E56CF')]
    })
    editor.select([node.id])
    const downloads: Array<{ bytes: Uint8Array; name: string; mime: string }> = []
    const actions = createDocumentExportActions(
      editor,
      editor.state,
      new IORegistry(BUILTIN_IO_FORMATS),
      (bytes, name, mime) => downloads.push({ bytes, name, mime })
    )
    await actions.exportSelection(4, 'svg')
    expect(downloads).toHaveLength(1)
    expect(downloads[0].name).toBe('One.svg')
    expect(downloads[0].mime).toBe('image/svg+xml')
    expect(strFromU8(downloads[0].bytes)).toContain('viewBox="0 0 80 40"')
  } finally {
    editor.dispose()
  }
})
