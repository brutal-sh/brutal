import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readPackageManifest, resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools'

import { publishBridge } from '../src/bridge'
import { buildBridge } from '../src/build'
import { verifyBridge } from '../src/verify'

test('a symlink at the candidate digest path cannot redirect chmod or activation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpen-runtime-collision-'))
  try {
    const runtime = join(directory, 'runtime')
    await mkdir(runtime)
    await writeFile(join(runtime, 'owner'), 'Open Pen local runtime v1\n')
    const candidate = join(directory, 'candidate')
    const foreign = join(directory, 'foreign')
    await writeFile(candidate, 'same bytes')
    await writeFile(foreign, 'same bytes', { mode: 0o600 })
    const digest = createHash('sha256').update('same bytes').digest('hex')
    await symlink(foreign, join(runtime, `openpen-mcp-${digest}`))
    await expect(
      publishBridge(candidate, runtime, join(directory, 'link'), 'unused')
    ).rejects.toThrow('non-file')
    expect((await stat(foreign)).mode & 0o777).toBe(0o600)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('standalone bridge starts from a directory outside the checkout with authenticated health', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpen-bundle-test-'))
  try {
    const workspace = await resolveWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))
    const manifest = await readPackageManifest(join(workspace, 'packages/mcp/package.json'))
    if (!manifest.version) throw new Error('Missing MCP version')
    const executable = join(directory, 'openpen-mcp-http')
    await buildBridge(workspace, executable)
    await verifyBridge(executable, manifest.version)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 30_000)

test('runtime migration replaces only the exact legacy link or a verified owned binary', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpen-migrate-test-'))
  try {
    const runtime = join(directory, 'runtime')
    const candidate = join(directory, 'candidate')
    const legacy = join(directory, 'legacy')
    const link = join(directory, 'openpen-mcp-http')
    await writeFile(legacy, 'old bridge')
    await writeFile(candidate, 'candidate one')
    await symlink(legacy, link)
    const first = await publishBridge(candidate, runtime, link, legacy)
    expect(await readlink(link)).toBe(first)
    expect(await readFile(legacy, 'utf8')).toBe('old bridge')
    expect(await publishBridge(candidate, runtime, link, legacy)).toBe(first)
    await writeFile(candidate, 'candidate two')
    const second = await publishBridge(candidate, runtime, link, legacy)
    expect(second).not.toBe(first)
    expect(await readFile(first, 'utf8')).toBe('candidate one')
    await writeFile(second, 'unexpected modification')
    await expect(publishBridge(candidate, runtime, link, legacy)).rejects.toThrow(
      'foreign or modified'
    )
    expect(await readlink(link)).toBe(second)
    const foreignLink = join(directory, 'foreign-link')
    await symlink(candidate, foreignLink)
    await expect(publishBridge(candidate, runtime, foreignLink, legacy)).rejects.toThrow(
      'foreign or modified'
    )
    await expect(publishBridge(candidate, runtime, legacy, legacy)).rejects.toThrow(
      'Refusing to replace'
    )
    expect(await readFile(legacy, 'utf8')).toBe('old bridge')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
