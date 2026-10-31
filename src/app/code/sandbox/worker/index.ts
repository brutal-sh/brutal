/**
 * The sandbox worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it
 * runs reaches no network: the worker's own globals for it are replaced before the first run.
 */
import type { SandboxRunRequest } from '@/app/code/sandbox/schema'

import { runDesignJSX } from './run'

const blocked = () => {
  throw new Error('Network access is unavailable in Design JSX.')
}
Object.defineProperties(self, {
  fetch: { value: blocked },
  XMLHttpRequest: { value: undefined },
  WebSocket: { value: undefined },
  EventSource: { value: undefined },
  importScripts: { value: blocked }
})

const report = self.postMessage.bind(self)

// Keep only synchronous language built-ins; the worker's Web APIs can recover hidden promises.
const SCRIPT_GLOBALS = new Set([
  'globalThis',
  'self',
  'Object',
  'Array',
  'ArrayBuffer',
  'DataView',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Float16Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'Math',
  'JSON',
  'String',
  'Number',
  'Boolean',
  'BigInt',
  'Symbol',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'RegExp',
  'Date',
  'Intl',
  'Reflect',
  'Proxy',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'AggregateError',
  'Infinity',
  'NaN',
  'undefined',
  'parseFloat',
  'parseInt',
  'isNaN',
  'isFinite',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'unescape',
  'TextEncoder',
  'TextDecoder'
])

function blockScriptGlobals() {
  let owner: object | null = self
  while (owner && owner !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(owner)) {
      if (SCRIPT_GLOBALS.has(name)) continue
      const descriptor = Object.getOwnPropertyDescriptor(owner, name)
      if (descriptor?.configurable || descriptor?.writable) {
        Object.defineProperty(owner, name, {
          value: undefined,
          configurable: false,
          writable: false
        })
      } else if (
        descriptor &&
        descriptor.value !== blocked &&
        (descriptor.get ||
          descriptor.set ||
          typeof descriptor.value === 'function' ||
          (descriptor.value !== null && typeof descriptor.value === 'object'))
      ) {
        throw new Error(`Cannot disable script API ${name}.`)
      }
    }
    owner = Object.getPrototypeOf(owner)
  }
  Object.defineProperty(Array, 'fromAsync', {
    value: undefined,
    configurable: false,
    writable: false
  })
  for (const callable of [
    function () {
      return undefined
    },
    async function () {
      return undefined
    },
    function* () {
      yield undefined
    },
    async function* () {
      yield undefined
    }
  ]) {
    Object.defineProperty(Object.getPrototypeOf(callable), 'constructor', {
      value: undefined,
      configurable: false,
      writable: false
    })
  }
}

self.onmessage = (event: MessageEvent<SandboxRunRequest>) => {
  try {
    if (event.data.canvasScript) blockScriptGlobals()
    report(runDesignJSX(event.data))
  } catch (error) {
    report({
      id: event.data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
