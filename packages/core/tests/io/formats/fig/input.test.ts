import { expect, test } from 'bun:test'
import { Buffer } from 'node:buffer'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'
import { SceneGraph } from '@open-pencil/scene-graph'

function inputView(bytes: Uint8Array, kind: 'plain' | 'typed' | 'buffer'): Uint8Array {
  if (kind === 'plain') return bytes
  const padded = Buffer.alloc(bytes.byteLength + 16, 0x5a)
  padded.set(bytes, 8)
  if (kind === 'buffer') return padded.subarray(8, 8 + bytes.byteLength)
  return new Uint8Array(padded.buffer, padded.byteOffset + 8, bytes.byteLength)
}

test.each(['plain', 'typed', 'buffer'] as const)(
  'reads the exact %s FIG byte view',
  async (kind) => {
    const io = new IORegistry(BUILTIN_IO_FORMATS)
    const original = new SceneGraph()
    original.createNode('RECTANGLE', original.getPages()[0].id, {
      name: 'Byte view shape',
      x: 12,
      y: 24,
      width: 120,
      height: 90
    })
    const saved = await io.writeDocument('fig', original)
    if (!(saved.data instanceof Uint8Array)) throw new Error('FIG writer returned text')
    const input = inputView(saved.data, kind)
    expect(new Uint8Array(input)).toEqual(new Uint8Array(saved.data))
    const reopened = await io.readDocument({ name: 'view.fig', data: input })
    expect(reopened.sourceFormat).toBe('fig')
    expect(reopened.graph.getChildren(reopened.graph.getPages()[0].id)).toMatchObject([
      { type: 'RECTANGLE', name: 'Byte view shape', x: 12, y: 24, width: 120, height: 90 }
    ])
  }
)
