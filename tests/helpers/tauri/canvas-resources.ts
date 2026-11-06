import * as v from 'valibot'

import { invokeNative } from './invoke'

const snapshotSchema = v.object({
  contexts: v.array(v.object({ connected: v.boolean(), lost: v.boolean(), error: v.number() })),
  errors: v.array(v.string())
})

/** Keeps bounded test observations in a removable listener, without adding Window state. */
export async function startNativeCanvasResourceProbe() {
  await invokeNative('native_test_mcp_configuration')
  await browser.execute(() => {
    const name = 'open-pen-native-canvas-resources'
    document.dispatchEvent(new CustomEvent(name, { detail: { command: 'stop' } }))
    const prototype = HTMLCanvasElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'getContext')
    if (!descriptor) throw new Error('Canvas context API unavailable')
    const original = prototype.getContext
    const originalError = console.error
    const seen = new Map<WebGLRenderingContext | WebGL2RenderingContext, HTMLCanvasElement>()
    const errors: string[] = []
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>('canvas[data-ready="1"]')) {
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      if (context) seen.set(context, canvas)
    }
    Object.defineProperty(prototype, 'getContext', {
      ...descriptor,
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        const context: unknown = Reflect.apply(original, this, args)
        if (context instanceof WebGLRenderingContext || context instanceof WebGL2RenderingContext)
          seen.set(context, this)
        return context
      }
    })
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
      originalError.apply(console, args)
    }
    const onError = (event: ErrorEvent) => errors.push(event.message)
    window.addEventListener('error', onError)
    const control = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const detail: unknown = event.detail
      if (!detail || typeof detail !== 'object') return
      if (Reflect.get(detail, 'command') === 'stop') {
        Object.defineProperty(prototype, 'getContext', descriptor)
        console.error = originalError
        window.removeEventListener('error', onError)
        document.removeEventListener(name, control)
      } else if (Reflect.get(detail, 'command') === 'read') {
        Reflect.set(detail, 'snapshot', {
          contexts: [...seen].map(([context, canvas]) => ({
            connected: canvas.isConnected,
            lost: context.isContextLost(),
            error: context.getError()
          })),
          errors: [...errors]
        })
      }
    }
    document.addEventListener(name, control)
  })
  return {
    async read() {
      const snapshot = await browser.execute(() => {
        const detail: { command: string; snapshot?: unknown } = { command: 'read' }
        document.dispatchEvent(new CustomEvent('open-pen-native-canvas-resources', { detail }))
        return detail.snapshot
      })
      return v.parse(snapshotSchema, snapshot)
    },
    async stop() {
      await browser.execute(() =>
        document.dispatchEvent(
          new CustomEvent('open-pen-native-canvas-resources', { detail: { command: 'stop' } })
        )
      )
    }
  }
}
