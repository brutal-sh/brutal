import { expect, spyOn, test } from 'bun:test'

import * as v from 'valibot'
import type { WebSocket } from 'ws'

import { createBrowserRPCBridge } from '#mcp/browser-rpc'

import { asDouble } from '#tests/helpers/doubles'

const frameSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    type: v.string(),
    id: v.optional(v.string()),
    command: v.optional(v.string())
  })
)

function fixture() {
  const frames: v.InferOutput<typeof frameSchema>[] = []
  const socket = asDouble<WebSocket>({
    OPEN: 1,
    readyState: 1,
    send: (text: string) => frames.push(v.parse(frameSchema, text)),
    close: () => undefined
  })
  const bridge = createBrowserRPCBridge({ authToken: null, onConnectionChange: () => undefined })
  const register = () =>
    bridge.handleMessage(JSON.stringify({ type: 'register', token: null }), socket)
  const reply = (id: string | undefined) =>
    bridge.handleMessage(JSON.stringify({ type: 'response', id, result: 'owned' }), socket)
  return { bridge, socket, frames, register, reply }
}

test('pre-aborted and waiting-app calls never reach a later registered browser', async () => {
  const owned = fixture()
  const controller = new AbortController()
  const removed = spyOn(controller.signal, 'removeEventListener')
  try {
    const waiting = owned.bridge.sendRPC(
      { command: 'owned-waiting' },
      { signal: controller.signal }
    )
    controller.abort()
    await expect(waiting).rejects.toThrow()
    expect(removed).toHaveBeenCalledTimes(1)
    await expect(
      owned.bridge.sendRPC({ command: 'owned-preabort' }, { signal: controller.signal })
    ).rejects.toThrow()
    owned.register()
    expect(owned.frames.some((frame) => frame.type === 'request')).toBe(false)
  } finally {
    removed.mockRestore()
    owned.bridge.close()
  }
})

test('cancellation removes only its generated pending ID and preserves a concurrent call', async () => {
  const owned = fixture()
  owned.register()
  const controller = new AbortController()
  const removed = spyOn(controller.signal, 'removeEventListener')
  try {
    const first = owned.bridge.sendRPC({ command: 'owned-first' }, { signal: controller.signal })
    const second = owned.bridge.sendRPC({ command: 'owned-second' })
    const requests = owned.frames.filter((frame) => frame.type === 'request')
    expect(requests).toHaveLength(2)
    controller.abort()
    await expect(first).rejects.toThrow()
    expect(removed).toHaveBeenCalledTimes(1)
    expect(owned.frames.filter((frame) => frame.type === 'cancel')).toEqual([
      { type: 'cancel', id: requests[0]?.id }
    ])
    owned.reply(requests[0]?.id)
    owned.reply(requests[1]?.id)
    expect(await second).toEqual({ result: 'owned' })
  } finally {
    removed.mockRestore()
    owned.bridge.close()
  }
})

test('settled calls remove their abort listener and late cancellation sends nothing', async () => {
  const owned = fixture()
  owned.register()
  const controller = new AbortController()
  const removed = spyOn(controller.signal, 'removeEventListener')
  try {
    const pending = owned.bridge.sendRPC({}, { signal: controller.signal })
    owned.reply(owned.frames.find((frame) => frame.type === 'request')?.id)
    expect(await pending).toEqual({ result: 'owned' })
    controller.abort()
    expect(removed).toHaveBeenCalledTimes(1)
    expect(owned.frames.some((frame) => frame.type === 'cancel')).toBe(false)
  } finally {
    removed.mockRestore()
    owned.bridge.close()
  }
})

test('replacement and close reject pending calls without sending cancellation to another socket', async () => {
  const owned = fixture()
  owned.register()
  const controller = new AbortController()
  const removed = spyOn(controller.signal, 'removeEventListener')
  try {
    const pending = owned.bridge.sendRPC({}, { signal: controller.signal })
    const replacementFrames: string[] = []
    const replacement = asDouble<WebSocket>({
      OPEN: 1,
      readyState: 1,
      send: (frame: string) => replacementFrames.push(frame)
    })
    owned.bridge.handleMessage(JSON.stringify({ type: 'register', token: null }), replacement)
    await expect(pending).rejects.toThrow('reconnected')
    controller.abort()
    expect(removed).toHaveBeenCalledTimes(1)
    expect(replacementFrames.some((frame) => v.parse(frameSchema, frame).type === 'cancel')).toBe(
      false
    )
    const second = owned.bridge.sendRPC({})
    owned.bridge.close()
    await expect(second).rejects.toThrow('shutting down')
  } finally {
    removed.mockRestore()
    owned.bridge.close()
  }
})

test('a closing registered socket waits for replacement without dispatching to the old browser', async () => {
  const owned = fixture()
  owned.register()
  Reflect.set(owned.socket, 'readyState', 2)
  const replacementFrames: string[] = []
  const replacement = asDouble<WebSocket>({
    OPEN: 1,
    readyState: 1,
    send: (frame: string) => replacementFrames.push(frame)
  })
  try {
    const pending = owned.bridge.sendRPC({ command: 'owned-after-closing' })
    expect(owned.frames.some((frame) => frame.type === 'request')).toBe(false)
    owned.bridge.handleMessage(JSON.stringify({ type: 'register', token: null }), replacement)
    await Promise.resolve()
    const request = replacementFrames
      .map((frame) => v.parse(frameSchema, frame))
      .find((frame) => frame.type === 'request')
    expect(request?.command).toBe('owned-after-closing')
    owned.bridge.handleMessage(
      JSON.stringify({ type: 'response', id: request?.id, result: 'replacement' }),
      replacement
    )
    expect(await pending).toEqual({ result: 'replacement' })
    expect(owned.frames.some((frame) => frame.type === 'request')).toBe(false)
  } finally {
    owned.bridge.close()
  }
})
