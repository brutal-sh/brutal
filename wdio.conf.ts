import { mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { TauriCapabilities } from '@wdio/tauri-service'

import { installCompanionVersionFixture } from './tests/helpers/tauri/companion-versions'

const root = dirname(fileURLToPath(import.meta.url))
const binaryName = process.platform === 'win32' ? 'OpenPencil.exe' : 'OpenPencil'
const appBinary = join(root, 'desktop', 'target', 'debug', binaryName)

const capability: TauriCapabilities = {
  browserName: 'tauri',
  'tauri:options': { application: appBinary }
}

// Parent and worker processes share one test-owned route. No production MCP files or ports.
if (!process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY) {
  process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY = await mkdtemp(
    join(tmpdir(), 'openpen-native-test-')
  )
  process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT = String(await allocatePort())
}
if (!process.env.OPENPENCIL_NATIVE_TEST_DRIVER_PORT) {
  process.env.OPENPENCIL_NATIVE_TEST_DRIVER_PORT = String(await allocatePort())
}

async function allocatePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No native test port allocated')
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
  return address.port
}

if (process.env.OPENPENCIL_NATIVE_COMPANION_VERSIONS === '1' && process.platform !== 'win32') {
  const directory = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
  if (!directory) throw new Error('Native companion fixture directory is unavailable')
  await installCompanionVersionFixture(directory)
}

export const config: WebdriverIO.Config = {
  runner: 'local',
  tsConfigPath: join(root, 'tests', 'e2e', 'native', 'tsconfig.json'),
  specs: [join(root, 'tests', 'e2e', 'native', '**', '*.spec.ts')],
  maxInstances: 1,
  maxInstancesPerCapability: 1,
  capabilities: [capability],
  services: [
    [
      '@wdio/tauri-service',
      {
        appBinaryPath: appBinary,
        driverProvider: 'embedded',
        embeddedPort: Number(process.env.OPENPENCIL_NATIVE_TEST_DRIVER_PORT),
        startTimeout: 120_000
      }
    ]
  ],
  framework: 'mocha',
  reporters: ['spec'],
  logLevel: 'warn',
  waitforTimeout: 20_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 1,
  mochaOpts: {
    ui: 'bdd',
    timeout: 60_000,
    require: [join(root, 'tests/helpers/tauri/session.ts')]
  }
}
