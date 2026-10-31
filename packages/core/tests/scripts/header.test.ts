import { describe, expect, test } from 'bun:test'

import { parseScriptHeader, resolveScriptInputs } from '#core/scripts/header'

const script = (declarations: string) => `/**\n * @schema 2.21\n${declarations}\n */\nreturn [];`

describe('linked canvas script inputs', () => {
  test('reads typed defaults, quoted punctuation and numeric bounds without executing defaults', () => {
    const inputs = parseScriptHeader(
      script(`
 * @input count: number(min=-2.5, max=5e1) = -4
 * @input caption: string = 'a,b) = title'
 * @input filled: boolean = true
 * @input ink: color = #AF34CC80
 * @input mode: enum("grid, rows", "stack)") = "stack)"
 * @input target: ref`)
    )
    expect(resolveScriptInputs(inputs, { count: 99, ignored: 'absent' })).toEqual({
      count: 50,
      caption: 'a,b) = title',
      filled: true,
      ink: '#AF34CC80',
      mode: 'stack)',
      target: ''
    })
    expect(inputs[0].value).toBe(-4)
    expect(() => parseScriptHeader(script('@input caption: string = (() => "ran")()'))).toThrow()
  })

  test('rejects malformed headers, duplicate/prototype names, invalid bounds and option values', () => {
    for (const declarations of [
      '@input count: number(min=3, max=1)',
      '@input count: number(min=1, min=2)',
      '@input count: number(min=Infinity)',
      '@input count: number = NaN',
      '@input mode: enum()',
      '@input mode: enum("a", "a")',
      '@input mode: enum("a") = "b"',
      '@input count: number = "3"',
      '@input x: boolean = 1',
      '@input constructor: string',
      '@input x: string\n@input x: number',
      '@input x: string(foo)',
      '@input x: enum("a") extra',
      '@input x: enum("a"',
      '@input x: enum("a"] + ["b")'
    ])
      expect(() => parseScriptHeader(script(declarations))).toThrow()
    expect(() => parseScriptHeader('return []')).toThrow()
    expect(() => parseScriptHeader('/** @schema 3.0 */\nreturn []')).toThrow()
    const inputs = parseScriptHeader(script('@input count: number = 1'))
    expect(() => resolveScriptInputs(inputs, { count: Infinity })).toThrow()
    expect(() => resolveScriptInputs(inputs, { count: '2' })).toThrow()
  })
})
