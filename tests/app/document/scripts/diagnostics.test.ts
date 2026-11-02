import { expect, test } from 'bun:test'

import { scriptExcerpt, scriptFailure } from '@/app/document/scripts/diagnostics'

test('Script diagnostics retain bounded authored VM frames and the nearby excerpt', () => {
  const source = '/** @schema 2.21 */\nconst value = 1;\nthrow new Error("Probe");'
  const error = {
    name: 'Error',
    message: 'Probe',
    stack:
      '    at <anonymous> (probe.js:3:16)\n    at <eval> (probe.js:4:3)\n    at worker (secret-host-file:99:1)\n'
  }
  expect(scriptFailure(error, source, 'probe.js')).toEqual({
    error: 'Probe',
    errorName: 'Error',
    line: 3,
    column: 16,
    stack: '    at <anonymous> (probe.js:3:16)\n    at <eval> (probe.js:4:3)\n'
  })
  expect(scriptExcerpt(source, 3)).toBe(
    '  1: /** @schema 2.21 */\n  2: const value = 1;\n> 3: throw new Error("Probe");'
  )
  for (const stack of [
    'at worker (secret-host-file:99:1)',
    'at <anonymous> (probe.js:999:1)',
    'at <anonymous> (probe.js:1:999999)',
    'at <anonymous> (other-probe.js:1:1)'
  ])
    expect(scriptFailure({ ...error, stack }, source, 'probe.js')).toEqual({
      error: 'Probe',
      errorName: 'Error'
    })
  expect(scriptFailure('x'.repeat(3000), source).error).toHaveLength(2000)
  expect(
    scriptFailure({ ...error, name: 'TypeError\nprivate' }, source, 'probe.js').errorName
  ).toBe('TypeError private')
})
