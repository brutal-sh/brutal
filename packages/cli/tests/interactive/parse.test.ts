import { expect, test } from 'bun:test'

import { parseInteractiveCall } from '#cli/interactive/parse'

test('shell arguments are data literals with normal object syntax', () => {
  expect(
    parseInteractiveCall(
      "create_shape({type:'RECTANGLE', x:-12, width:64, nested:[true,null,{name:'a,b)'}],});"
    )
  ).toEqual({
    name: 'create_shape',
    args: { type: 'RECTANGLE', x: -12, width: 64, nested: [true, null, { name: 'a,b)' }] },
    hasArgs: true
  })
  expect(parseInteractiveCall('get_page_tree()')).toEqual({
    name: 'get_page_tree',
    args: {},
    hasArgs: false
  })
})

test.each([
  'process.exit()',
  'tool(); save()',
  'tool({x:process.exit()})',
  'tool({get x(){throw 1}})',
  'tool({...process.env})',
  'tool({["x"]:1})',
  'tool({x:()=>1})',
  'tool({x:undefined})',
  'tool({x:NaN})',
  'tool({x:Infinity})',
  'tool({x:1e999})',
  'tool({x:1n})',
  'tool({x:/pattern/})',
  'tool({x:[,1]})',
  'tool({__proto__:{polluted:true}})',
  'tool({constructor:{}})',
  'tool([])',
  'tool({}, {})',
  'tool(...[])',
  'tool?.()',
  'tool({x})'
])('refuses executable or ambiguous input: %s', (source) => {
  expect(() => parseInteractiveCall(source)).toThrow()
})

test('shell data is bounded before invoking a tool', () => {
  expect(() => parseInteractiveCall(`tool({x:'${'a'.repeat(1_000_001)}'})`)).toThrow()
  expect(() => parseInteractiveCall(`tool({x:'${'💜'.repeat(250_001)}'})`)).toThrow()
  expect(() => parseInteractiveCall(`tool({x:${'['.repeat(40)}0${']'.repeat(40)}})`)).toThrow()
})
