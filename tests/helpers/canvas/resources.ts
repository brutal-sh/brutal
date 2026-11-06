/** Observe actual contexts without exposing fixture state on Window. */
export function createCanvasResourceProbe() {
  const prototype = HTMLCanvasElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'getContext')
  if (!descriptor) throw new Error('Canvas context API unavailable')
  const original = prototype.getContext
  const seen = new Map<
    WebGLRenderingContext | WebGL2RenderingContext,
    { canvas: HTMLCanvasElement; stack: string | undefined }
  >()
  for (const element of document.querySelectorAll<HTMLCanvasElement>('canvas[data-ready="1"]')) {
    const context = element.getContext('webgl2') ?? element.getContext('webgl')
    if (context) seen.set(context, { canvas: element, stack: undefined })
  }
  Object.defineProperty(prototype, 'getContext', {
    ...descriptor,
    value: function (this: HTMLCanvasElement, ...args: unknown[]) {
      const result: unknown = Reflect.apply(original, this, args)
      if (result instanceof WebGLRenderingContext || result instanceof WebGL2RenderingContext) {
        if (!seen.has(result))
          seen.set(result, {
            canvas: this,
            stack: new Error('Canvas GPU context allocated').stack
          })
      }
      return result
    }
  })
  return {
    read: () =>
      [...seen].map(([context, { canvas, stack }]) => ({
        connected: canvas.isConnected,
        lost: context.isContextLost(),
        width: canvas.width,
        height: canvas.height,
        testId: canvas.dataset.testId,
        stack
      })),
    restore: () => Object.defineProperty(prototype, 'getContext', descriptor)
  }
}
