import { describe, expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { exportFigFile } from '@open-pencil/core/io/formats/fig'
import { PenExportError, parsePenDocument } from '@open-pencil/pen'
import { SceneGraph } from '@open-pencil/scene-graph'
import { isExportFormatId } from '@open-pencil/scene-graph/export-format'

const io = new IORegistry(BUILTIN_IO_FORMATS)

function bytes(data: string | Uint8Array) {
  return typeof data === 'string' ? new TextEncoder().encode(data) : data
}

describe('.pen shared I/O export', () => {
  test('is discoverable for write and every export scope, including export settings', () => {
    expect(io.listWritableFormats().some((format) => format.id === 'pen')).toBe(true)
    for (const scope of ['document', 'page', 'selection', 'node'] as const) {
      expect(io.listExportFormats(scope).some((format) => format.id === 'pen')).toBe(true)
    }
    expect(isExportFormatId('pen')).toBe(true)
  })

  test('read, edit, export and reopen retains stack layout and editable text/shape', async () => {
    const source = {
      version: '2.21',
      children: [
        {
          id: 'frame',
          type: 'frame',
          layout: 'horizontal',
          width: 400,
          height: 100,
          padding: 12,
          gap: 8,
          children: [
            {
              id: 'shape',
              type: 'rectangle',
              width: 70,
              height: 'fill_container',
              fill: '#FF1122'
            },
            {
              id: 'text',
              type: 'text',
              content: 'Before',
              fontSize: 18,
              width: 150,
              height: 30,
              textGrowth: 'fixed-width-height'
            }
          ]
        }
      ]
    }
    const { graph } = await io.readDocument({
      name: 'input.pen',
      data: bytes(JSON.stringify(source))
    })
    graph.updateNode('text', { text: 'Edited' })
    graph.updateNode('shape', { cornerRadius: 8 })
    const result = await io.exportContent('pen', { graph, target: { scope: 'document' } })
    expect(result).toMatchObject({
      extension: 'pen',
      mimeType: 'application/json',
      encoding: 'utf8'
    })
    const reopened = await io.readDocument({ name: 'result.pen', data: bytes(result.data) })
    expect(reopened.graph.getNode('frame')).toMatchObject({
      layoutMode: 'HORIZONTAL',
      itemSpacing: 8,
      paddingTop: 12
    })
    expect(reopened.graph.getNode('shape')).toMatchObject({ cornerRadius: 8, height: 76 })
    expect(reopened.graph.getNode('text')?.text).toBe('Edited')
    expect(reopened.graph.getNode('text')?.x).toBe(graph.getNode('text')?.x)
  })

  test('saves editable Pen text after restoring a FIG recovery snapshot', async () => {
    const original = new SceneGraph()
    original.createNode('TEXT', original.getPages()[0].id, {
      text: 'Office layout',
      width: 120,
      height: 24
    })
    const backup = await exportFigFile(original)
    const { graph } = await io.readDocument({ name: 'recovery.fig', data: backup })
    const [text] = graph.getChildren(graph.getPages()[0].id)
    expect(text.fontFeatures).toEqual([
      { tag: 'LIGA', enabled: true },
      { tag: 'CALT', enabled: true }
    ])

    const saved = await io.writeDocument('pen', graph)
    const { graph: reopened } = await io.readDocument({
      name: 'recovered.pen',
      data: bytes(saved.data)
    })
    expect(reopened.getChildren(reopened.getPages()[0].id)[0]?.text).toBe('Office layout')

    graph.updateNode(text.id, { fontFeatures: [{ tag: 'LIGA', enabled: false }] })
    await expect(io.writeDocument('pen', graph)).rejects.toThrow('/fontFeatures')
    graph.updateNode(text.id, { fontFeatures: [{ tag: 'DLIG', enabled: true }] })
    await expect(io.writeDocument('pen', graph)).rejects.toThrow('/fontFeatures')
  })

  test('multi-page document refuses flattening, while exporting one page works', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('RECTANGLE', page.id)
    graph.addPage('Second')
    await expect(io.writeDocument('pen', graph)).rejects.toThrow(PenExportError)
    const result = await io.exportContent('pen', {
      graph,
      target: { scope: 'page', pageId: page.id }
    })
    expect(typeof result.data).toBe('string')
    if (typeof result.data === 'string')
      expect(parsePenDocument(result.data).children).toHaveLength(1)
  })

  test('selection reuses ancestor context without exporting unselected siblings', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id)
    const shape = graph.createNode('RECTANGLE', frame.id)
    graph.createNode('ELLIPSE', frame.id)
    const before = [...graph.getAllNodes()].map((node) => structuredClone(node))
    const result = await io.exportContent('pen', {
      graph,
      target: { scope: 'node', nodeId: shape.id }
    })
    if (typeof result.data !== 'string') throw new Error('Expected JSON text')
    const doc = parsePenDocument(result.data)
    expect(doc.children[0].id).toBe(frame.id)
    expect(doc.children[0].children?.map((node) => node.id)).toEqual([shape.id])
    expect([...graph.getAllNodes()]).toEqual(before)
  })
})

describe('.pen embedded image roundtrip', () => {
  const url =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
  test.each(['cover', 'contain', 'stretch'])(
    'keeps %s image bytes and placement without an asset host',
    async (mode) => {
      const source = {
        version: '2.21',
        children: [
          {
            id: 'r',
            type: 'rectangle',
            width: 70,
            height: 30,
            fill: {
              type: 'image',
              url,
              mode,
              opacity: 0.75,
              ...(mode === 'stretch' ? { transform: [2, 0, 0, 2, -0.2, -0.3] } : {})
            }
          }
        ]
      }
      const { graph } = await io.readDocument({
        name: 'image.pen',
        data: bytes(JSON.stringify(source))
      })
      const result = await io.writeDocument('pen', graph)
      const { graph: reopened } = await io.readDocument({
        name: 'image-output.pen',
        data: bytes(result.data)
      })
      expect(reopened.images).toEqual(graph.images)
      expect(reopened.getNode('r')?.fills).toEqual(graph.getNode('r')?.fills)
    }
  )
})

test('page export ignores stale active modes from unreferenced empty collections', async () => {
  const { graph } = await io.readDocument({
    name: 'plain.pen',
    data: bytes('{"version":"2.21","children":[{"id":"r","type":"rectangle"}]}')
  })
  const result = await io.exportContent('pen', {
    graph,
    target: { scope: 'page', pageId: graph.getPages()[0].id }
  })
  expect(result.extension).toBe('pen')
})
