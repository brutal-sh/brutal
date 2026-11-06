import { mkdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, delimiter, dirname, join } from 'node:path'

/** Test-owned executables make version guards fail before any real agent can start. */
export async function installCompanionVersionFixture(root: string): Promise<void> {
  const checked = await realpath(root)
  if (
    dirname(checked) !== (await realpath(tmpdir())) ||
    !basename(checked).startsWith('openpen-native-test-')
  ) {
    throw new Error('Companion fixtures require the native runner’s temporary directory')
  }
  const directory = join(checked, 'version-bin')
  await mkdir(directory, { recursive: true })
  const script = `#!/bin/sh
printf '%s\\n' "$*" >> "$0.calls"
case "$1" in
  --version) echo 0.0.0; exit 0;;
esac
echo "Unexpected companion fixture execution" >&2
exit 73
`
  for (const executable of ['openpen-mcp-http', 'openpencil-harness', 'codex-acp']) {
    await writeFile(join(directory, executable), script, { mode: 0o700 })
  }
  process.env.PATH = `${directory}${delimiter}${process.env.PATH ?? ''}`
}
