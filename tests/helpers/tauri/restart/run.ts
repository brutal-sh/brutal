import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { repoPath } from '#tests/helpers/paths'

import { runNativeExistingFileRecovery } from './existing-file'

const receipt = await runNativeExistingFileRecovery(
  repoPath('desktop', 'target', 'debug', 'OpenPencil')
)
const path = join(receipt.first.root, 'restart-receipt.json')
await writeFile(path, JSON.stringify(receipt, null, 2), { mode: 0o600, flag: 'wx' })
process.stdout.write(`Executed native existing-file recovery: ${path}\n`)
