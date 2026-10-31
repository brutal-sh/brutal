import { expect, test } from 'bun:test'

import { validateScriptSyntax } from '#core/scripts/syntax'

test('accepts synchronous expressions and rejects nested async, await and imports', () => {
  expect(() =>
    validateScriptSyntax('const cell = (x) => ({type: "rectangle", width:x}); return [cell(20)];')
  ).not.toThrow()
  for (const source of [
    'return (async () => [])();',
    'async function f() {} return [];',
    'function f() { return import("https://example.invalid/") } return [];',
    'const x = { async method() {} }; return [];',
    'await 1; return [];',
    'const x = [async function* () {}]; return [];'
  ])
    expect(() => validateScriptSyntax(source)).toThrow()
})
