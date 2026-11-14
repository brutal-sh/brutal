import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { Page } from '@playwright/test'

import { parseDiscoveryInfo } from '@open-pencil/mcp/discovery'

import type * as Runtime from '@/app/automation/mcp/runtime'
import type * as AppTabs from '@/app/tabs'

export async function privateDiscoveryDigest(path: string) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
}

/** Copy only the test server's identity into a private disposable file, never an artifact. */
export async function copyOwnedDiscovery(source: string) {
  const info = parseDiscoveryInfo(await readFile(source, 'utf8'))
  if (!info) throw new Error('Invalid owned discovery')
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-session-identity-'))
  const path = join(dir, 'mcp.json')
  await writeFile(path, JSON.stringify(info), { mode: 0o600 })
  return {
    path,
    replace: () =>
      writeFile(path, JSON.stringify({ ...info, startedAt: 'owned-replacement-identity' }), {
        mode: 0o600
      }),
    cleanup: () => rm(dir, { recursive: true, force: true })
  }
}

export async function setOwnedBridgeRunning(page: Page, running: boolean) {
  return page.evaluate(async (running) => {
    const runtimeURL = '/src/app/automation/mcp/runtime.ts'
    const runtime: typeof Runtime = await import(runtimeURL)
    if (!running) return runtime.stopMCPRuntime()
    const moduleURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(moduleURL)
    return runtime.startMCPRuntime(tabs.getActiveStore)
  }, running)
}
