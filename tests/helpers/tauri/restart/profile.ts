import { mkdtemp, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { randomIndex } from '@open-pencil/scene-graph/random'

import { allocateNativePort } from '../ports'

export async function createNativeRecoveryProfile(binary: string) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'openpen-native-test-recovery-')))
  const marker = join(root, 'recovery-profile.json')
  const storeId = Array.from({ length: 16 }, () => randomIndex(256))
  if (storeId.every((byte) => byte === 0)) throw new Error('Invalid zero recovery store identity')
  await writeFile(marker, JSON.stringify({ version: 1, storeId }), {
    mode: 0o600,
    flag: 'wx'
  })
  return {
    root,
    marker,
    storeId,
    binary: await realpath(binary),
    mcpPort: await allocateNativePort()
  }
}
