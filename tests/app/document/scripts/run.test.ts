import { expect, test } from 'bun:test'

import RELEASE_SYNC from '@jitl/quickjs-wasmfile-release-sync'
import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten-core'

import { SCRIPT_LIMITS } from '@open-pencil/core/scripts/limits'

import { runCanvasScript } from '@/app/document/scripts/run'

const QuickJS = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC)
const execute = (code: string, filename?: string) =>
  runCanvasScript(
    {
      id: 'probe',
      code,
      canvasScript: { width: 200, height: 120, input: {}, filename },
      elements: {},
      helpers: [],
      limits: SCRIPT_LIMITS
    },
    QuickJS
  )

test('QuickJS isolates each Script and preserves authored error lines without host paths', () => {
  expect(
    execute(
      '/** @schema 2.21 */\nconst value = 1;\nthrow new Error("Independent failure");',
      '/private/owner/work/probe.js'
    )
  ).toMatchObject({
    ok: false,
    error: 'Independent failure',
    errorName: 'Error',
    line: 3,
    column: 16,
    stack: '    at <anonymous> (probe.js:3:16)\n    at <anonymous> (probe.js:4:2)\n'
  })
  const first = execute(
    'globalThis.changed = true; return [{type:"rectangle",x:Math.random(),width:pencil.width,height:pencil.height}];'
  )
  expect(first).toMatchObject({
    ok: true,
    value: [{ width: 200, height: 120, x: 0.26642920868471265 }]
  })
  expect(execute('return [{type:"text",content:String(typeof changed)}];')).toMatchObject({
    ok: true,
    value: [{ content: 'undefined' }]
  })
  expect(
    execute('return [{type:"rectangle",x:Math.random(),width:pencil.width,height:pencil.height}];')
  ).toEqual(first)
})

test('QuickJS provides pencil as the Script argument without adding a global', () => {
  expect(
    execute(
      'return [{type:"text",content:String(arguments[0]===pencil && globalThis.pencil===undefined)}];'
    )
  ).toMatchObject({ ok: true, value: [{ content: 'true' }] })
})

test('QuickJS refuses values JSON transfer would erase or coerce', () => {
  for (const value of [
    '()=>1',
    'undefined',
    'Infinity',
    'NaN',
    'new Date()',
    'new Map()',
    'Symbol("probe")'
  ])
    expect(execute(`return [{type:"rectangle",width:${value}}];`)).toMatchObject({ ok: false })
  expect(execute('const a={};a.child=a;return [a];')).toMatchObject({ ok: false })
  expect(
    execute('Object.prototype.toJSON=()=>[]; return [{type:"rectangle",width:()=>1}];')
  ).toMatchObject({ ok: false })
})

test('QuickJS transfers each validated getter once and ignores inherited or hidden serializers', () => {
  expect(
    execute(
      'let reads=0;return [{type:"rectangle",width:20,height:20,get fill(){return reads++===0?"#ff0000":()=>1;}}];'
    )
  ).toMatchObject({ ok: true, value: [{ fill: '#ff0000' }] })
  expect(
    execute(
      'const nodes=[{type:"rectangle",width:20,height:20}];Object.defineProperty(nodes,"toJSON",{value:()=>[]});return nodes;'
    )
  ).toMatchObject({ ok: true, value: [{ width: 20, height: 20 }] })
  expect(
    execute(
      'Object.prototype.toJSON=()=>[];Array.prototype.toJSON=()=>[];return [{type:"rectangle",width:20,height:20}];'
    )
  ).toMatchObject({ ok: true, value: [{ width: 20, height: 20 }] })
})

test('QuickJS reports authored first-line columns without the wrapper prefix', () => {
  expect(execute('/** @schema 2.21 */ throw new Error("First");', 'one-line.js')).toMatchObject({
    ok: false,
    line: 1,
    column: 36,
    stack: expect.stringContaining('(one-line.js:1:36)')
  })
})

test('QuickJS locates Unicode-named functions and omits URL query data from virtual filenames', () => {
  expect(
    execute(
      '/** @schema 2.21 */\nfunction café(){throw new Error("Probe");}\ncafé();',
      'https://example.invalid/épreuve.js?token=private-probe'
    )
  ).toMatchObject({ ok: false, line: 2, stack: expect.stringContaining('at café (épreuve.js:2:') })
  expect(execute('throw new Error("Probe");', 'probe\u0085.js')).toMatchObject({
    ok: false,
    stack: expect.stringContaining('(probe_.js:1:')
  })
})

test('QuickJS interrupts CPU and heap exhaustion and subsequent contexts still execute', () => {
  expect(execute('while(true){}')).toMatchObject({
    ok: false,
    error: expect.stringContaining('interrupted')
  })
  expect(execute('return new Array(100_000_000).fill(1);')).toMatchObject({
    ok: false,
    error: expect.stringContaining('memory')
  })
  expect(execute('throw {get message(){while(true){}},name:"Error"};')).toMatchObject({ ok: false })
  expect(execute('return [{type:"rectangle",width:64,height:32}];')).toMatchObject({
    ok: true,
    value: [{ width: 64, height: 32 }]
  })
})
