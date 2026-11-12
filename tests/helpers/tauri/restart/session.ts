import { strict as assert } from 'node:assert'

import { cleanupWdioSession, createTauriCapabilities, startWdioSession } from '@wdio/tauri-service'

import { allocateNativePort } from '../ports'
import { ownedNativeProcess, waitNativeProcessExit, type RecoveryIdentity } from './identity'
import { createNativeRecoveryProfile } from './profile'

async function readIdentity(session: WebdriverIO.Browser) {
  return session.execute(async () => {
    const core = window.__TAURI__?.core
    if (!core) throw new Error('Native recovery requires the test WebView API')
    return core.invoke<unknown>('native_test_recovery_identity')
  })
}

export async function createNativeRecoveryRestart(binary: string) {
  assert.equal(process.platform, 'darwin', 'Persistent native recovery requires macOS 14+')
  const owner = await createNativeRecoveryProfile(binary)
  const restoreRouting = routeOwnedProfile(owner)
  let session: WebdriverIO.Browser | null = null
  let lastIdentity: RecoveryIdentity | null = null
  return {
    owner,
    async launch(documentPath?: string) {
      assert.equal(session, null, 'Close the previous native session before restarting')
      const opened = await launchOwnedSession(owner, documentPath)
      session = opened.session
      lastIdentity = opened.identity
      return opened
    },
    async crash() {
      assert.ok(session, 'No native session to interrupt')
      const identity = await ownedNativeProcess(await readIdentity(session), owner)
      process.kill(identity.pid, 'SIGKILL')
      await waitNativeProcessExit(identity.pid)
      await cleanupWdioSession(session)
      session = null
      lastIdentity = null
      return identity
    },
    async close() {
      if (session) {
        const identity = await ownedNativeProcess(await readIdentity(session), owner)
        await closeOwnedSession(session, identity)
      }
      session = null
      lastIdentity = null
    },
    async dispose() {
      try {
        if (session && lastIdentity) await closeOwnedSession(session, lastIdentity)
      } finally {
        restoreRouting()
      }
    }
  }
}

function routeOwnedProfile(owner: Awaited<ReturnType<typeof createNativeRecoveryProfile>>) {
  const previousRoot = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
  const previousPort = process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT
  process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY = owner.root
  process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT = String(owner.mcpPort)
  return () => {
    if (previousRoot === undefined) delete process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
    else process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY = previousRoot
    if (previousPort === undefined) delete process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT
    else process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT = previousPort
  }
}

async function launchOwnedSession(
  owner: Awaited<ReturnType<typeof createNativeRecoveryProfile>>,
  documentPath?: string
) {
  assert.equal(process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY, owner.root)
  assert.equal(process.env.OPENPENCIL_NATIVE_TEST_MCP_PORT, String(owner.mcpPort))
  const appArgs = [`--open-pen-native-test-profile=${owner.marker}`]
  if (documentPath) appArgs.push(documentPath)
  const capabilities = createTauriCapabilities(owner.binary, {
    appArgs,
    driverProvider: 'embedded'
  })
  const session = await startWdioSession(capabilities, {
    driverProvider: 'embedded',
    embeddedPort: await allocateNativePort()
  })
  try {
    const identity = await ownedNativeProcess(await readIdentity(session), owner)
    return { session, identity }
  } catch (error) {
    await cleanupWdioSession(session)
    throw error
  }
}

async function closeOwnedSession(session: WebdriverIO.Browser, identity: RecoveryIdentity) {
  await cleanupWdioSession(session)
  await waitNativeProcessExit(identity.pid)
}
