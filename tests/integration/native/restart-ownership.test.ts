import { describe, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  ownedNativeProcess,
  waitNativeProcessExit,
  type NativeRestartOwner,
  type RecoveryIdentity
} from '#tests/helpers/tauri/restart/identity'

async function withOwnedChild(
  flags: (marker: string) => string[],
  check: (identity: RecoveryIdentity, owner: NativeRestartOwner) => Promise<void>
) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'openpen-native-test-identity-')))
  const marker = join(root, 'recovery-profile.json')
  await writeFile(marker, '{}', { mode: 0o600 })
  const binary = await realpath(process.execPath)
  const storeId = Array.from({ length: 16 }, (_, index) => index + 1)
  const child = spawn(binary, ['-e', 'setInterval(() => {}, 1000)', ...flags(marker)], {
    stdio: 'ignore'
  })
  const closed = new Promise<void>((resolve) => {
    child.once('close', () => resolve())
  })
  try {
    if (!child.pid) throw new Error('No owned child PID')
    await check(
      {
        pid: child.pid,
        executable: binary,
        root,
        marker,
        storeId,
        appData: join(root, 'profile-data')
      },
      { root, marker, storeId, binary }
    )
  } finally {
    child.kill()
    await closed
    if (child.pid) await waitNativeProcessExit(child.pid)
    await rm(root, { recursive: true })
  }
}

const nativeTest = test.skipIf(process.platform === 'win32')

describe('native restart process ownership', () => {
  nativeTest('accepts only the live owned executable and matching identity', async () => {
    await withOwnedChild(
      (marker) => [`--open-pen-native-test-profile=${marker}`],
      async (value, owner) => {
        expect((await ownedNativeProcess(value, owner)).pid).toBe(value.pid)
        await expect(ownedNativeProcess({ ...value, pid: process.pid }, owner)).rejects.toThrow()
        await expect(ownedNativeProcess({ ...value, storeId: [99] }, owner)).rejects.toThrow()
        await expect(ownedNativeProcess({ ...value, appData: owner.root }, owner)).rejects.toThrow()
        await expect(ownedNativeProcess({ ...value, marker: owner.root }, owner)).rejects.toThrow()
        await expect(ownedNativeProcess({ ...value, pid: 1 }, owner)).rejects.toThrow()
        await expect(
          ownedNativeProcess({ ...value, executable: owner.marker }, owner)
        ).rejects.toThrow()
      }
    )
  })

  for (const mode of ['missing', 'duplicate', 'different'] as const) {
    nativeTest(`refuses a live process with ${mode} profile arguments`, async () => {
      await withOwnedChild(
        (marker) => {
          const flag = `--open-pen-native-test-profile=${marker}`
          if (mode === 'missing') return []
          if (mode === 'duplicate') return [flag, flag]
          return [`--open-pen-native-test-profile=${marker}.other`]
        },
        async (value, owner) => {
          await expect(ownedNativeProcess(value, owner)).rejects.toThrow()
        }
      )
    })
  }

  nativeTest('refuses self or invalid PIDs before an exit wait', async () => {
    await expect(waitNativeProcessExit(process.pid)).rejects.toThrow()
    await expect(waitNativeProcessExit(1)).rejects.toThrow()
    await expect(waitNativeProcessExit(2.5)).rejects.toThrow()
  })
})
