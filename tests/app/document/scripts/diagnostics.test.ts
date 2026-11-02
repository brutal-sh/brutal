import { expect, test } from 'bun:test'

import { scriptExcerpt, scriptFailure } from '@/app/document/scripts/diagnostics'

test('Script diagnostics map bounded worker locations to authored lines and a nearby excerpt', () => {
  const source = '/** @schema 2.21 */\nconst value = 1;\nthrow new Error("Probe");\nreturn [];'
  const error = new Error('Probe')
  error.stack = 'Error: Probe\n at anonymous (open-pen-script.js:6:7)\n at secret-host-file:99:1'
  expect(scriptFailure(error, source)).toEqual({
    error: 'Probe',
    line: 3,
    column: 7
  })
  expect(scriptExcerpt(source, 3)).toBe(
    '  1: /** @schema 2.21 */\n  2: const value = 1;\n> 3: throw new Error("Probe");\n  4: return [];'
  )
  error.stack = 'at secret-host-file:99:1'
  expect(scriptFailure(error, source)).toEqual({ error: 'Probe' })
  error.stack = 'at anonymous (open-pen-script.js:999:1)'
  expect(scriptFailure(error, source)).toEqual({ error: 'Probe' })
  Object.assign(error, { line: 6, column: 7 })
  error.stack = 'anonymous@\nworker@blob:null/owned-worker:7:100'
  expect(scriptFailure(error, source)).toEqual({
    error: 'Probe',
    line: 3,
    column: 7
  })
  error.stack = 'worker@blob:null/owned-worker:7:100'
  expect(scriptFailure(error, source)).toEqual({ error: 'Probe' })
  expect(scriptFailure('x'.repeat(3000), source).error).toHaveLength(2000)
})
