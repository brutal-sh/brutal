import { afterEach, expect, test } from 'bun:test'

import { yieldToUI } from '@/app/document/io/browser'

const originalFrame = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
const originalCancel = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame')

afterEach(() => {
  for (const [key, original] of [
    ['requestAnimationFrame', originalFrame],
    ['cancelAnimationFrame', originalCancel]
  ] as const) {
    if (original) Object.defineProperty(globalThis, key, original)
    else Reflect.deleteProperty(globalThis, key)
  }
})

function pausedFrames() {
  const callbacks: FrameRequestCallback[] = []
  const canceled: number[] = []
  Object.defineProperties(globalThis, {
    requestAnimationFrame: {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callbacks.push(callback)
        return callbacks.length
      }
    },
    cancelAnimationFrame: {
      configurable: true,
      value: (id: number) => {
        canceled.push(id)
      }
    }
  })
  return { callbacks, canceled }
}

test('document preparation continues when animation frames are paused', async () => {
  const { canceled } = pausedFrames()
  await yieldToUI()
  expect(canceled).toEqual([1])
})

test('document preparation yields to an available foreground frame', async () => {
  const { callbacks } = pausedFrames()
  let finished = false
  const pending = yieldToUI().then(() => {
    finished = true
    return finished
  })
  await Promise.resolve()
  expect(finished).toBe(false)
  callbacks[0]?.(performance.now())
  await pending
  expect(finished).toBe(true)
})
