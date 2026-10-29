import { afterEach, describe, expect, test } from 'bun:test'

import { openRouterLoopback } from '@/app/ai/providers/openrouter/loopback'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(clearTauriMocks)

describe('OpenRouter native loopback', () => {
  test('uses the allocated local callback, waits for a validated result and cancels its own attempt', async () => {
    const calls: Array<{ command: string; args: unknown }> = []
    await mockTauriIPC((command, args) => {
      calls.push({ command, args })
      if (command === 'chatgpt_oauth_listen') return 'http://localhost:53124/auth/callback'
      if (command === 'chatgpt_oauth_wait') return { kind: 'code', code: 'test-code' }
    })

    const { callbackURL, callback } = await openRouterLoopback('attempt-a')
    expect(callbackURL).toBe('http://localhost:53124/auth/callback')
    expect(calls[0]).toMatchObject({
      command: 'chatgpt_oauth_listen',
      args: { state: 'attempt-a', provider: 'openrouter' }
    })
    expect(await callback.wait()).toEqual({ kind: 'code', code: 'test-code' })
    callback.close()
    expect(calls.at(-1)).toEqual({ command: 'chatgpt_oauth_cancel', args: { state: 'attempt-a' } })
  })

  test('rejects a non-loopback redirect and releases the listener', async () => {
    const commands: string[] = []
    await mockTauriIPC((command) => {
      commands.push(command)
      if (command === 'chatgpt_oauth_listen')
        return 'https://app.openpencil.dev/oauth/openrouter-desktop.html'
    })

    await expect(openRouterLoopback('attempt-b')).rejects.toThrow()
    expect(commands).toEqual(['chatgpt_oauth_listen', 'chatgpt_oauth_cancel'])
  })

  test('does not accept malformed native results as an authorization code', async () => {
    await mockTauriIPC((command) => {
      if (command === 'chatgpt_oauth_listen') return 'http://localhost:53124/auth/callback'
      if (command === 'chatgpt_oauth_wait') return { kind: 'code' }
    })
    const { callback } = await openRouterLoopback('attempt-c')
    await expect(callback.wait()).rejects.toThrow()
    callback.close()
  })
})
