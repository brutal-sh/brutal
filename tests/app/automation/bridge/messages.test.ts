import { expect, test } from 'bun:test'

import { createAutomationMessages } from '@/app/automation/bridge/messages'
import { createDeferred } from '@/app/runtime/deferred'

import { asDouble } from '#tests/helpers/doubles'

function fixture() {
  const sent: string[] = []
  const signals: AbortSignal[] = []
  const held = createDeferred<unknown>()
  const socket = asDouble<WebSocket>({
    readyState: WebSocket.OPEN,
    send: (body: string) => sent.push(body)
  })
  const messages = createAutomationMessages(socket, async (_command, _args, signal) => {
    signals.push(signal)
    return held.promise
  })
  const send = (type: string, id: string) =>
    messages.receive(
      new MessageEvent('message', {
        data: JSON.stringify({ type, id, command: 'owned', args: {} })
      })
    )
  return { messages, sent, signals, held, send }
}

test('matching IDs on different sockets cannot cancel each other', async () => {
  const first = fixture()
  const other = fixture()
  const pending = [first.send('request', 'owned'), other.send('request', 'owned')]
  try {
    await first.send('cancel', 'owned')
    expect(first.signals[0]?.aborted).toBe(true)
    expect(other.signals[0]?.aborted).toBe(false)
    first.messages.close()
    expect(other.signals[0]?.aborted).toBe(false)
    other.messages.close()
    expect(other.signals[0]?.aborted).toBe(true)
  } finally {
    first.held.resolve({ ok: true })
    other.held.resolve({ ok: true })
    await Promise.all(pending)
    first.messages.close()
    other.messages.close()
  }
})

test('unknown and settled cancellation cannot poison a later request', async () => {
  const owned = fixture()
  await owned.send('cancel', 'owned')
  const pending = owned.send('request', 'owned')
  try {
    expect(owned.signals[0]?.aborted).toBe(false)
    owned.held.resolve({ ok: true })
    await pending
    await owned.send('cancel', 'owned')
    expect(owned.signals[0]?.aborted).toBe(false)
    expect(owned.sent).toHaveLength(1)
  } finally {
    owned.held.resolve({ ok: true })
    await pending
    owned.messages.close()
  }
})

test('duplicate request IDs preserve the first controller and close aborts it', async () => {
  const owned = fixture()
  const pending = owned.send('request', 'owned')
  try {
    await owned.send('request', 'owned')
    expect(owned.signals).toHaveLength(1)
    owned.messages.abort()
    expect(owned.signals[0]?.aborted).toBe(true)
    await owned.send('request', 'after-disconnect')
    expect(owned.signals).toHaveLength(1)
  } finally {
    owned.held.resolve({ ok: true })
    await pending
    owned.messages.close()
  }
})
