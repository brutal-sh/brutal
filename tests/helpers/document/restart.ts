import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { promisify } from 'node:util'

import { expect, type BrowserContext, type BrowserType, type TestInfo } from '@playwright/test'

type LaunchOptions = NonNullable<Parameters<BrowserType['launchPersistentContext']>[1]>
type StorageState = Parameters<BrowserContext['setStorageState']>[0]
const executeFile = promisify(execFile)

async function ownedBrowser(context: BrowserContext, profile: string) {
  const browser = context.browser()
  if (!browser) throw new Error('Persistent browser unavailable')
  const session = await browser.newBrowserCDPSession()
  try {
    const result = await session.send('SystemInfo.getProcessInfo')
    const owners = result.processInfo.filter((entry) => entry.type === 'browser')
    expect(owners).toHaveLength(1)
    const pid = owners.at(0)?.id
    if (
      !pid ||
      !Number.isSafeInteger(pid) ||
      pid <= 1 ||
      pid === process.pid ||
      pid === process.ppid
    )
      throw new Error('Invalid owned browser process identity')
    // Persistent Chromium omits --enable-automation, so CDP cannot return its command line.
    const command = await executeFile('ps', ['-p', String(pid), '-o', 'command='])
    expect(command.stdout).toContain(`--user-data-dir=${profile}`)
    return { browser, pid, version: browser.version(), profile }
  } finally {
    await session.detach()
  }
}

/** A fresh test-output profile; interruption never targets the user's running browser. */
export async function createRecoveryRestartProfile(
  browserType: BrowserType,
  options: LaunchOptions,
  info: TestInfo
) {
  const profile = await mkdtemp(info.outputPath('recovery-profile-'))
  let context: BrowserContext | null = null
  return {
    async launch(seed?: StorageState) {
      if (context) throw new Error('Close the previous recovery browser before restarting')
      context = await browserType.launchPersistentContext(profile, options)
      if (seed) {
        if (typeof seed === 'string')
          throw new Error('Recovery fixture requires inline runner state')
        await context.setStorageState(seed)
      }
      const identity = await ownedBrowser(context, profile)
      const page = context.pages().at(0) ?? (await context.newPage())
      return { page, pid: identity.pid, version: identity.version, profile }
    },
    async crash() {
      if (!context) throw new Error('Recovery browser is not running')
      const { browser, pid } = await ownedBrowser(context, profile)
      const disconnected = new Promise<void>((resolve) => {
        browser.once('disconnected', () => resolve())
      })
      process.kill(pid, 'SIGKILL')
      await disconnected
      expect(browser.isConnected()).toBe(false)
      context = null
      return { pid, signal: 'SIGKILL', profile }
    },
    async close() {
      if (context) await context.close()
      context = null
    }
  }
}
