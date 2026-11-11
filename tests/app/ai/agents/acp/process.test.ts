import { afterEach, expect, test, vi } from 'bun:test'

import { spawnACPProcess } from '@/app/ai/agents/acp/process'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

afterEach(async () => {
  await clearTauriMocks()
  vi.restoreAllMocks()
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'navigator')
})

test.each(['macOS', 'Windows'])(
  'scopes Codex configuration before spawning on %s',
  async (platform) => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: platform }
    })
    const calls: string[] = []
    const config = '{"model":"retained","skills":{"include_instructions":false}}'
    await mockTauriIPC((cmd, args) => {
      calls.push(cmd)
      if (cmd === 'codex_acp_config') return config
      if (cmd === 'plugin:shell|spawn') {
        expect(args).toMatchObject({
          program: platform === 'Windows' ? 'cmd-codex-acp' : 'codex-acp',
          options: { encoding: 'raw', env: { CODEX_CONFIG: config } }
        })
        return 42
      }
      return null
    })
    const process = await spawnACPProcess({
      command: 'codex-acp',
      args: [],
      logId: 'test',
      destroying: () => true,
      onUnexpectedClose: vi.fn()
    })
    expect(calls).toEqual(['codex_acp_config', 'plugin:shell|spawn'])
    await process.child.kill()
  }
)

test('does not spawn Codex if inherited configuration cannot be retained', async () => {
  const calls: string[] = []
  await mockTauriIPC((cmd) => {
    calls.push(cmd)
    throw new Error('Invalid Codex configuration.')
  })
  await expect(
    spawnACPProcess({
      command: 'codex-acp',
      args: [],
      logId: 'test',
      destroying: () => false,
      onUnexpectedClose: vi.fn()
    })
  ).rejects.toThrow('Invalid Codex configuration.')
  expect(calls).toEqual(['codex_acp_config'])
})

test.each([true, false])(
  'drains buffered bytes before close (owner stopping: %s)',
  async (stopping) => {
    const unexpected = vi.fn()
    await mockTauriIPC((cmd, args) => {
      if (cmd === 'plugin:shell|spawn') {
        const event = (args as { onEvent: { onmessage: (value: unknown) => void } }).onEvent
          .onmessage
        event({ event: 'Stdout', payload: [1, 2] })
        event({ event: 'Stdout', payload: [3] })
        event({ event: 'Terminated', payload: { code: 0, signal: null } })
        return 43
      }
      return null
    })
    const process = await spawnACPProcess({
      command: 'agent-cli',
      args: [],
      logId: 'test',
      destroying: () => stopping,
      onUnexpectedClose: unexpected
    })
    const reader = process.output.getReader()
    expect(await reader.read()).toEqual({ done: false, value: new Uint8Array([1, 2]) })
    expect(await reader.read()).toEqual({ done: false, value: new Uint8Array([3]) })
    if (stopping) {
      expect(await reader.read()).toEqual({ done: true, value: undefined })
      expect(unexpected).not.toHaveBeenCalled()
    } else {
      await expect(reader.read()).rejects.toThrow('Agent process exited unexpectedly.')
      expect(unexpected).toHaveBeenCalledTimes(1)
    }
    await process.child.kill()
  }
)
