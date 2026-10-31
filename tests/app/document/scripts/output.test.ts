import { describe, expect, test } from 'bun:test'

import { scriptOutput } from '@/app/document/scripts/output'

describe('linked canvas script output boundary', () => {
  test('validates nested editable nodes, assigns unique IDs and accepts empty output', () => {
    const nodes = scriptOutput([
      {
        type: 'frame',
        width: 20,
        height: 30,
        children: [{ type: 'rectangle', width: 10, height: 12, fill: '#AF34CC' }]
      }
    ])
    expect(nodes[0]).toMatchObject({
      type: 'frame',
      id: 'script-1',
      children: [{ id: 'script-2' }]
    })
    expect(scriptOutput([])).toEqual([])
    expect(scriptOutput(Array.from({ length: 1000 }, () => ({ type: 'rectangle' })))).toHaveLength(
      1000
    )
  })

  test('rejects invalid or unbounded output before document mutation', () => {
    for (const output of [
      {},
      [null],
      [{ type: 'rectangle', width: Number.NaN }],
      [{ type: 'frame', reusable: true }],
      [{ type: 'script' }],
      [{ type: 'ref', ref: 'unresolved' }],
      [{ type: 'browser' }],
      [{ type: 'rectangle', children: {} }],
      [{ type: 'unknown' }],
      [{ type: 'rectangle', width: () => 1 }],
      [{ type: 'rectangle', fill: { type: 'unsupported' } }],
      [{ type: 'frame', children: Array.from({ length: 1000 }, () => ({ type: 'rectangle' })) }],
      JSON.parse('[{"type":"rectangle","__proto__":{}}]')
    ])
      expect(() => scriptOutput(output)).toThrow()
  })
})
