import { expect, mock, test } from 'bun:test'

import { createMCPRuntimeService } from '@/app/automation/mcp/runtime'

test('a browser without local automation never probes or starts a localhost server', async () => {
  const spawn = mock(async () => null)
  const readHealth = mock(async () => null)
  const connect = mock(() => () => undefined)
  const runtime = createMCPRuntimeService({
    canConnect: () => false,
    getBrowserURL: () => 'ws://127.0.0.1:7610',
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

test('connects the editor socket to the route resolved while the MCP server starts', async () => {
  let browserURL = 'ws://127.0.0.1:7610'
  const connect = mock((_getStore: unknown, _token: string | null, _url: string) => () => undefined)
  const runtime = createMCPRuntimeService({
    canConnect: () => true,
    getBrowserURL: () => browserURL,
    connect,
    spawn: async () => {
      browserURL = 'ws://127.0.0.1:49123'
      return { authToken: 'test-only-token', managed: true, disconnect: () => undefined }
    },
    readHealth: async () => ({ status: 'no_app', agentSessionEvents: true }),
    setToolDescriptors: () => undefined,
    getStartupFailure: () => null,
    getHealthFailure: () => null
  })
  const getStore = () => {
    throw new Error('The socket connector is inspected before it needs a document')
  }
  expect(await runtime.start(getStore)).toEqual({ ok: true })
  expect(connect).toHaveBeenCalledWith(getStore, 'test-only-token', 'ws://127.0.0.1:49123')
})
