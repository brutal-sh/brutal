import { expect, test, type Page } from '@playwright/test'

import type { ScriptValue } from '@open-pencil/scene-graph/scripts'

import type { evaluateCanvasScript as EvaluateCanvasScript } from '@/app/document/scripts/evaluate'

import { CanvasHelper } from '#tests/helpers/canvas'

const header = '/** @schema 2.21 */\n'

async function execute(page: Page, source: string, values: Record<string, ScriptValue> = {}) {
  return page.evaluate(
    async ({ source, values }) => {
      const modulePath = '/src/app/document/scripts/evaluate.ts'
      const { evaluateCanvasScript } = (await import(/* @vite-ignore */ modulePath)) as {
        evaluateCanvasScript: typeof EvaluateCanvasScript
      }
      return evaluateCanvasScript(source, 200, 120, values)
    },
    { source, values }
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await new CanvasHelper(page).waitForInit()
})

test('executes bounded Script dimensions, typed inputs and deterministic random in fresh workers', async ({
  page
}) => {
  const source = `/**
 * @schema 2.21
 * @input columns: number(min=1, max=5) = 3
 * @input ink: color = #34A878
 * @input caption: string = "Independent"
 * @input filled: boolean = true
 * @input distribution: enum("even", "alternate") = "even"
 */
return Array.from({length: Math.floor(pencil.input.columns)}, (_, index) => ({
  type: 'rectangle', name: pencil.input.caption, x: index * pencil.width / pencil.input.columns,
  y: pencil.input.distribution === 'alternate' ? index % 2 * 10 : 0,
  width: pencil.width / pencil.input.columns - 6, height: pencil.height - 30,
  fill: pencil.input.filled ? pencil.input.ink : '#FFFFFF00', cornerRadius: Math.floor(Math.random()*10)
}));`
  const values = { columns: 9, caption: 'Bounded', distribution: 'alternate' }
  const first = await execute(page, source, values)
  const second = await execute(page, source, values)
  expect(first.ok, JSON.stringify(first)).toBe(true)
  expect(second).toEqual(first)
  if (!first.ok) return
  expect(first.nodes).toHaveLength(5)
  expect(first.nodes[0]).toMatchObject({ width: 34, height: 90, name: 'Bounded', fill: '#34A878' })
  expect(first.nodes[1].y).toBe(10)
  expect(first.input.columns).toBe(5)
  expect(await execute(page, header + 'return [];')).toMatchObject({ ok: true, nodes: [] })
  const random = await execute(
    page,
    header +
      `return Array.from({length:5}, () => ({type:'rectangle',x:Math.random(),width:1,height:1}));`
  )
  expect(random.ok).toBe(true)
  if (random.ok)
    expect(random.nodes.map((node) => node.x)).toEqual([
      0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111,
      0.46732782293111086
    ])
  await expect(page.locator('iframe[sandbox="allow-scripts"]')).toHaveCount(0)
})

test('denies DOM, network, filesystem and async services even through global constructors', async ({
  page
}) => {
  let requests = 0
  await page.route('**/canvas-script-denied*', async (route) => {
    requests++
    await route.abort()
  })
  const environment = await execute(
    page,
    header +
      `return [{ type: 'text', content: [
    typeof document, typeof window, typeof navigator, typeof require, typeof indexedDB,
    typeof setTimeout, typeof setInterval, typeof queueMicrotask, typeof Worker,
    typeof SharedWorker, typeof WebSocket, typeof WebTransport, typeof XMLHttpRequest,
    typeof postMessage, typeof addEventListener
  ].join(',') }];`
  )
  expect(environment.ok, JSON.stringify(environment)).toBe(true)
  if (environment.ok)
    expect(environment.nodes[0].content).toBe(
      Array.from({ length: 15 }, () => 'undefined').join(',')
    )
  const prototypes = await execute(
    page,
    header +
      `const workerPrototype = Object.getPrototypeOf(self);
  return [{type:'text',content:[
    typeof workerPrototype.setTimeout,
    typeof Object.getOwnPropertyDescriptor(workerPrototype, 'navigator')?.get,
    typeof workerPrototype.postMessage,
    typeof (function(){}).constructor,
    typeof Promise, typeof crypto, typeof caches, typeof WebAssembly,
    typeof Response, typeof Blob, typeof MessageChannel, typeof MessagePort,
    typeof ReadableStream, typeof Array.fromAsync
  ].join(',')}];`
  )
  expect(prototypes.ok).toBe(true)
  if (prototypes.ok)
    expect(prototypes.nodes[0].content).toBe(
      Array.from({ length: 14 }, () => 'undefined').join(',')
    )
  for (const body of [
    `fetch('https://script-probe.invalid/canvas-script-denied'); return [];`,
    `({}).constructor.constructor('return this')().fetch('https://script-probe.invalid/canvas-script-denied'); return [];`,
    `importScripts('https://script-probe.invalid/canvas-script-denied'); return [];`,
    `return import('https://script-probe.invalid/canvas-script-denied');`,
    `return Promise.resolve([]);`,
    `const P = new Response('').text().constructor; P.resolve().then(() => {}); return [];`,
    `Array.fromAsync([]); return [];`,
    `new MessageChannel(); return [];`,
    `setTimeout(() => {}, 0); return [];`
  ])
    expect(await execute(page, header + body)).toMatchObject({ ok: false })
  expect(requests).toBe(0)
  await expect(page.locator('iframe[sandbox="allow-scripts"]')).toHaveCount(0)
})

test('terminates infinite code, rejects unsafe output and allows a subsequent execution', async ({
  page
}) => {
  for (const body of [
    'while(true) {}',
    'return Array.from({ length: 1001 }, () => ({ type: "rectangle" }));',
    'return [{type:"frame",reusable:true}];',
    'return [{type:"ref",ref:"unresolved"}];',
    'return [{type:"rectangle",width:Infinity}];',
    'return [{type:"rectangle",width:()=>1}];',
    'return [{type:"text",content:"x".repeat(100001)}];',
    'throw new Error("Original probe failure");'
  ])
    expect(await execute(page, header + body)).toMatchObject({ ok: false })
  const recovered = await execute(page, header + 'return [{type:"rectangle",width:30,height:40}];')
  expect(recovered).toMatchObject({ ok: true, nodes: [{ width: 30, height: 40 }] })
  await expect(page.locator('iframe[sandbox="allow-scripts"]')).toHaveCount(0)
})
