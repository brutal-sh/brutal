import { describe, expect, test } from 'bun:test'

import { IORegistry, penFormat } from '@open-pencil/core/io'
import { PenImportError } from '@open-pencil/pen'

describe('penFormat import loss preflight', () => {
  test('refuses unsupported content through shared I/O before reading assets', async () => {
    const io = new IORegistry([penFormat])
    let assetReads = 0
    const data = new TextEncoder().encode(
      JSON.stringify({
        version: '2.21',
        children: [
          { id: 'image', type: 'rectangle', fill: { type: 'image', url: './image.png' } },
          { id: 'script', type: 'script', scriptUri: './chart.js' }
        ]
      })
    )
    await expect(
      io.readDocument({
        name: 'unsupported.pen',
        data,
        readAsset: () => {
          assetReads += 1
          return Promise.resolve(null)
        }
      })
    ).rejects.toThrow(PenImportError)
    expect(assetReads).toBe(0)
  })
})
