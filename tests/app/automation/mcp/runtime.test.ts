import { expect, mock, test } from 'bun:test'

import { createMCPRuntimeService } from '@/app/automation/mcp/runtime'

test('a browser without local automation never probes or starts a localhost server', async () => {
  const spawn = mock(async () => null)
  const readHealth = mock(async () => null)
  const connect = mock(() => () => undefined)
  const runtime = createMCPRuntimeService({
    canConnect: () => false,
    spawn,
    readHealth,
    connect,
    setToolDescriptors: () => undefined,
    getStartupFailure: () => null,
    getHealthFailure: () => null
  })

  const unavailableStore = () => {
    throw new Error('No editor is needed for unavailable automation')
  }
  expect(await runtime.start(unavailableStore)).toEqual({ ok: true })
  expect(await runtime.refresh()).toEqual({ ok: true })
  expect(await runtime.restart()).toEqual({ ok: true })
  expect(runtime.state.status).toBe('stopped')
  expect(spawn).not.toHaveBeenCalled()
  expect(readHealth).not.toHaveBeenCalled()
  expect(connect).not.toHaveBeenCalled()
})
