import { strict as assert } from 'node:assert'
import { realpath } from 'node:fs/promises'

import { loadNativeTestMCPConfiguration } from '@/app/automation/mcp/native-test'

import { invokeNative } from './invoke'

export const mochaHooks = {
  async beforeAll() {
    const directory = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
    assert.ok(directory, 'Native test run directory is unavailable')
    const configuration = await loadNativeTestMCPConfiguration(invokeNative)
    assert.equal(
      await realpath(configuration.root),
      await realpath(directory),
      'Wrong native test process'
    )
    assert.equal(configuration.port, Number(process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT))
  }
}
