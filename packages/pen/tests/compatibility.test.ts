import { describe, expect, test } from 'bun:test'

import {
  buildPenGraph,
  inspectPenCompatibility,
  parsePenDocument,
  parsePenFile,
  PenImportError,
  type PenDocument
} from '@open-pencil/pen'

const frame = { id: 'frame', type: 'frame', width: 100, height: 100 }

describe('.pen import compatibility', () => {
  test('reports exact paths through children and descendant overrides', () => {
    const doc: PenDocument = {
      version: '2.21',
      imports: { 'brand/dark': './brand.lib.pen' },
      children: [
        {
          ...frame,
          slot: [],
          children: [{ id: 'browser', type: 'browser', url: 'https://example.com' }],
          descendants: {
            'button/label~1': {
              fill: [
                { type: 'mesh_gradient', columns: 7 },
                { type: 'color', color: '#FFFFFF', blendMode: 'futureBurn' }
              ],
              effect: { type: 'shader', url: './effect.glsl' }
            }
          }
        }
      ]
    }
    expect(inspectPenCompatibility(doc).map(({ code, path }) => ({ code, path }))).toEqual([
      { code: 'unsupported-import', path: '/imports/brand~1dark' },
      { code: 'unsupported-slot', path: '/children/0/slot' },
      { code: 'unsupported-node', path: '/children/0/children/0/type' },
      { code: 'unsupported-paint', path: '/children/0/descendants/button~1label~01/fill/0' },
      {
        code: 'unsupported-blend',
        path: '/children/0/descendants/button~1label~01/fill/1/blendMode'
      },
      { code: 'unsupported-effect', path: '/children/0/descendants/button~1label~01/effect' }
    ])
    expect(inspectPenCompatibility(doc)[2]?.nodeId).toBe('browser')
  })

  test.each(['browser', 'prompt', 'note', 'context', 'future-node'])(
    'refuses %s instead of producing a generic frame or dropping it',
    (type) => {
      expect(() => parsePenFile(JSON.stringify({ children: [{ id: 'node', type }] }))).toThrow(
        PenImportError
      )
    }
  )

  test('refuses known loss before calling the layout service and keeps source unchanged', () => {
    const doc: PenDocument = {
      children: [{ ...frame, fill: { type: 'future-paint' } }]
    }
    const original = structuredClone(doc)
    let layoutCalls = 0
    expect(() =>
      buildPenGraph(doc, {
        layout: () => {
          layoutCalls += 1
        }
      })
    ).toThrow(PenImportError)
    expect(layoutCalls).toBe(0)
    expect(doc).toEqual(original)
  })

  test('leaves schema-only parsing available to inspect unsupported data', () => {
    const doc = { children: [{ id: 'script', type: 'script', scriptUri: './chart.js' }] }
    expect(parsePenDocument(JSON.stringify(doc))).toEqual(doc)
  })

  test.each(['3.0', '2.23', 'future'])('rejects unrecognized schema %s', (version) => {
    expect(inspectPenCompatibility({ version, children: [frame] })[0]?.code).toBe(
      'unsupported-version'
    )
  })

  test.each([undefined, '1', '2.8', '2.14', '2.17', '2.21', '2.22'])(
    'keeps existing supported content readable for version %s',
    (version) => {
      const doc: PenDocument = {
        version,
        children: [
          {
            ...frame,
            reusable: true,
            slot: false,
            fill: [{ type: 'gradient', gradientType: 'radial' }, '#FFFFFF'],
            stroke: { thickness: 1, fill: '#000000' },
            effect: { type: 'shadow', blendMode: 'multiply' }
          }
        ]
      }
      expect(inspectPenCompatibility(doc)).toEqual([])
      expect(buildPenGraph(doc).getNode('frame')?.type).toBe('COMPONENT')
    }
  )

  test.each(['prompt', 'context'])(
    'keeps unsupported schema 2.22 %s data intact when refusing import',
    (type) => {
      const doc: PenDocument = {
        version: '2.22',
        children: [{ id: 'unsupported', type, content: 'Keep this text', color: '#FEE484' }]
      }
      const original = structuredClone(doc)
      expect(inspectPenCompatibility(doc).map(({ code, path }) => ({ code, path }))).toEqual([
        { code: 'unsupported-node', path: '/children/0/type' }
      ])
      expect(() => buildPenGraph(doc)).toThrow(PenImportError)
      expect(doc).toEqual(original)
    }
  )

  test('checks stroke paints, future effects and replacements in overrides', () => {
    const doc: PenDocument = {
      children: [
        {
          ...frame,
          descendants: {
            label: {
              id: 'replacement',
              type: 'text',
              reusable: true,
              stroke: { type: 'gradient', gradientType: 'future' },
              effect: [{ type: 'future' }, { type: 'shadow', blendMode: 'futureDodge' }]
            }
          }
        }
      ]
    }
    expect(inspectPenCompatibility(doc).map((item) => item.code)).toEqual([
      'unsupported-component',
      'unsupported-paint',
      'unsupported-effect',
      'unsupported-blend'
    ])
  })

  test('keeps every structured issue while bounding the displayed error', () => {
    const doc: PenDocument = {
      children: Array.from({ length: 10 }, (_, i) => ({
        id: `browser-${i}`,
        type: 'browser'
      }))
    }
    const error = new PenImportError(inspectPenCompatibility(doc))
    expect(error.code).toBe('pen-import-loss')
    expect(error.diagnostics).toHaveLength(10)
    expect(error.message).toContain('2 more issue(s)')
    expect(error.message).toContain('Keep the original file')
  })
})
