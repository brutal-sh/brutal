import { strict as assert } from 'node:assert'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname } from 'node:path'

import * as v from 'valibot'

import { ensureNativeEditorReady } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

const healthSchema = v.pipe(v.string(), v.parseJson(), v.object({ status: v.string() }))

const nativeConfigurationSchema = v.object({ discoveryPath: v.string() })

const discoveryFileSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    pid: v.pipe(v.number(), v.integer(), v.minValue(1)),
    httpPort: v.number(),
    authToken: v.string()
  })
)

const NOT_INSTALLED = 'MCP automation is not installed'

async function openMCPSettings(): Promise<void> {
  // The platform shortcut is how the existing native settings spec opens Settings.
  await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
  await browser.waitUntil(
    () =>
      browser.execute(() =>
        Boolean(document.querySelector('[data-test-id="app-settings-dialog"]'))
      ),
    { timeout: 10_000, timeoutMsg: 'Settings did not open' }
  )
  await (await $('[data-test-id="settings-section-mcp"]')).click()
  await browser.waitUntil(
    () =>
      browser.execute(() =>
        Boolean(document.querySelector('[data-test-id="settings-mcp-automation-panel"]'))
      ),
    { timeout: 10_000, timeoutMsg: 'MCP settings panel did not render' }
  )
}

function mcpStatus(): Promise<string | null> {
  return browser.execute(
    () =>
      document
        .querySelector<HTMLElement>(
          '[data-test-id="settings-mcp-automation-panel"] [role="status"]'
        )
        ?.textContent?.trim() ?? null
  )
}

function mcpAlert(): Promise<string | null> {
  return browser.execute(
    () =>
      document
        .querySelector<HTMLElement>(
          '[data-test-id="settings-mcp-failure"] [data-slot="alert-heading"]'
        )
        ?.textContent?.trim() ?? null
  )
}

/** Expand the failure disclosure and read the technical payload. */
function mcpFailureDetail(): Promise<string | null> {
  return browser.executeAsync((done) => {
    document
      .querySelector<HTMLElement>('[data-test-id="settings-mcp-failure-details"] button')
      ?.click()
    requestAnimationFrame(() => {
      done(
        document
          .querySelector<HTMLElement>('[data-test-id="settings-mcp-failure-detail"]')
          ?.textContent?.trim() ?? null
      )
    })
  })
}

/** Restart lives in the Local server section header, whether or not the server failed. */
function clickRestart(): Promise<void> {
  return browser.execute(() => {
    document.querySelector<HTMLButtonElement>('[data-test-id="settings-mcp-restart"]')?.click()
  })
}

async function waitForStatus(expected: string): Promise<void> {
  try {
    await browser.waitUntil(async () => (await mcpStatus()) === expected, { timeout: 30_000 })
  } catch {
    throw new Error(
      `MCP status was "${await mcpStatus()}" instead of "${expected}"; ` +
        `alert "${await mcpAlert()}"; detail "${await mcpFailureDetail()}"`
    )
  }
}

describe('native MCP server lifecycle', () => {
  // Native specs share one app process, which remembers the open Settings
  // section. Restore General before closing so the next spec finds it.
  afterEach(async () => {
    await browser.execute(() => {
      document.querySelector<HTMLElement>('[data-test-id="settings-section-general"]')?.click()
      document.querySelector<HTMLElement>('[data-test-id="app-settings-done"]')?.click()
    })
    await browser.waitUntil(
      () => browser.execute(() => !document.querySelector('[data-test-id="app-settings-dialog"]')),
      { timeout: 10_000, timeoutMsg: 'Settings did not close after the MCP spec' }
    )
  })

  it('uses the server it resolves, or reports why it cannot', async () => {
    await ensureNativeEditorReady()
    await openMCPSettings()

    // The app resolves the binary through the PATH it derives from the login
    // shell, so assert what it resolved rather than injecting a fixture.
    const lookup = await invokeNative<{ available: boolean; path: string | null }>('mcp_lookup')

    if (!lookup.available || !lookup.path) {
      // Without a global install the reason must be the install itself.
      await waitForStatus('Error')
      assert.equal(await mcpAlert(), NOT_INSTALLED)
      console.debug('Native MCP acceptance: missing-install refusal')
      return
    }

    // A resolvable binary either becomes healthy, or is refused with a reason.
    await browser.waitUntil(async () => (await mcpStatus()) !== 'Starting', { timeout: 30_000 })
    if ((await mcpStatus()) === 'Error') {
      const detail = await mcpFailureDetail()
      assert.match(
        detail ?? '',
        /requires @open-pencil\/mcp|major\.minor compatibility/,
        `resolved ${lookup.path} but failed without a version explanation: ${detail}`
      )
      console.debug('Native MCP acceptance: version refusal')
      return
    }

    await waitForStatus('Running')
    const directory = process.env.OPENPENCIL_NATIVE_TEST_DIRECTORY
    assert.ok(directory, 'test-owned MCP directory missing from the runner')
    const { discoveryPath } = v.parse(
      nativeConfigurationSchema,
      await invokeNative<unknown>('native_test_mcp_configuration')
    )
    assert.equal(realpathSync(dirname(discoveryPath)), realpathSync(directory))
    const discovery = v.parse(discoveryFileSchema, readFileSync(discoveryPath, 'utf8'))
    assert.ok(discovery.authToken, 'discovery file omitted the auth token')

    // The spawned server serves the app: real port, real token.
    const health = await fetch(`http://127.0.0.1:${discovery.httpPort}/health`, {
      headers: { authorization: `Bearer ${discovery.authToken}` }
    })
    assert.equal(health.status, 200)
    assert.equal(v.parse(healthSchema, await health.text()).status, 'ok')

    // Restart only the server owned by this test; never hide an installed executable.
    await clickRestart()
    await browser.waitUntil(
      () => {
        try {
          const next = v.parse(discoveryFileSchema, readFileSync(discoveryPath, 'utf8'))
          return next.pid !== discovery.pid
        } catch {
          return false
        }
      },
      { timeout: 30_000, timeoutMsg: 'Restart did not publish a new test-owned MCP process' }
    )
    await browser.waitUntil(
      () => {
        try {
          process.kill(discovery.pid, 0)
          return false
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return true
          throw error
        }
      },
      { timeout: 30_000, timeoutMsg: 'The previous test-owned MCP process is still alive' }
    )
    await waitForStatus('Running')
    const restarted = v.parse(discoveryFileSchema, readFileSync(discoveryPath, 'utf8'))
    const restartedHealth = await fetch(`http://127.0.0.1:${restarted.httpPort}/health`, {
      headers: { authorization: `Bearer ${restarted.authToken}` }
    })
    assert.equal(restartedHealth.status, 200)
    assert.equal(v.parse(healthSchema, await restartedHealth.text()).status, 'ok')
    console.debug('Native MCP acceptance: authenticated healthy restart and old process exit', {
      previousPid: discovery.pid,
      currentPid: restarted.pid
    })
  })
})
