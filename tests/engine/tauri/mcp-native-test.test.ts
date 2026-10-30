import { expect, test } from 'bun:test'

import {
  loadNativeTestMCPConfiguration,
  nativeTestMCPRoute
} from '@/app/automation/mcp/native-test'

test('runner overrides route health checks and every spawned MCP location to the same test fixture', async () => {
  const configuration = await loadNativeTestMCPConfiguration(async (command) => {
    expect(command).toBe('native_test_mcp_configuration')
    return {
      discoveryPath: '/tmp/openpen-native-test-123/mcp.json',
      socketPath: '/tmp/openpen-native-test-123/mcp.sock',
      root: '/tmp/openpen-native-test-123',
      port: 49123
    }
  })
  expect(nativeTestMCPRoute(configuration)).toEqual({
    httpURL: 'http://127.0.0.1:49123',
    browserURL: 'ws://127.0.0.1:49123',
    env: {
      PORT: '49123',
      OPENPENCIL_MCP_DISCOVERY_PATH: '/tmp/openpen-native-test-123/mcp.json',
      OPENPENCIL_MCP_SOCKET: '/tmp/openpen-native-test-123/mcp.sock',
      OPENPENCIL_MCP_ROOT: '/tmp/openpen-native-test-123'
    }
  })
})

test('missing test routing fails rather than falling back to the production route', async () => {
  await expect(loadNativeTestMCPConfiguration(async () => null)).rejects.toThrow()
  await expect(
    loadNativeTestMCPConfiguration(async () => {
      throw new Error('Missing runner configuration')
    })
  ).rejects.toThrow('Missing runner configuration')
})
