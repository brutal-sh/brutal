import { strict as assert } from 'node:assert'
import { execFile } from 'node:child_process'
import { readFile, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { promisify } from 'node:util'

import * as v from 'valibot'

const execute = promisify(execFile)
const identitySchema = v.strictObject({
  pid: v.pipe(v.number(), v.integer(), v.minValue(2)),
  executable: v.string(),
  marker: v.string(),
  root: v.string(),
  storeId: v.pipe(
    v.array(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))),
    v.length(16)
  ),
  appData: v.string()
})

export type RecoveryIdentity = v.InferOutput<typeof identitySchema>
export type NativeRestartOwner = {
  root: string
  marker: string
  storeId: number[]
  binary: string
}

async function liveProcess(pid: number) {
  if (process.platform === 'linux') {
    const [executable, commandLine] = await Promise.all([
      realpath(`/proc/${pid}/exe`),
      readFile(`/proc/${pid}/cmdline`, 'utf8')
    ])
    return { executable, args: commandLine.split('\0') }
  }
  const [executable, command] = await Promise.all([
    execute('ps', ['-p', String(pid), '-o', 'comm=']),
    execute('ps', ['-ww', '-p', String(pid), '-o', 'command='])
  ])
  return {
    executable: await realpath(executable.stdout.trim()),
    args: command.stdout.trim().split(/\s+/)
  }
}

export async function ownedNativeProcess(value: unknown, owner: NativeRestartOwner) {
  const identity = v.parse(identitySchema, value)
  assert.notEqual(identity.pid, process.pid)
  assert.notEqual(identity.pid, process.ppid)
  assert.equal(identity.root, await realpath(owner.root))
  assert.equal(identity.marker, await realpath(owner.marker))
  assert.equal(await realpath(identity.executable), await realpath(owner.binary))
  assert.deepEqual(identity.storeId, owner.storeId)
  assert.ok(identity.storeId.some((byte) => byte !== 0))
  assert.equal(identity.appData, join(identity.root, 'profile-data'))
  const { executable, args } = await liveProcess(identity.pid)
  assert.equal(executable, await realpath(owner.binary))
  const flags = args.filter((part) => part.startsWith('--open-pen-native-test-profile'))
  assert.deepEqual(flags, [`--open-pen-native-test-profile=${owner.marker}`])
  return identity
}

export async function waitNativeProcessExit(pid: number) {
  assert.ok(Number.isSafeInteger(pid) && pid > 1 && pid !== process.pid && pid !== process.ppid)
  const deadline = performance.now() + 10_000
  while (performance.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return
      throw error
    }
    await setTimeout(50)
  }
  throw new Error(`Owned native process ${pid} did not exit`)
}
