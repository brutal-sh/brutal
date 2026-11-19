import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readPackageManifest, resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools'

import { buildBridge } from './build'
import { verifyBridge } from './verify'

if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  throw new Error('The macOS beta must be built on Apple silicon with an arm64 Bun runtime.')
}

const workspace = await resolveWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))
const manifest = await readPackageManifest(join(workspace, 'packages/mcp/package.json'))
if (!manifest.version) throw new Error('The MCP package has no version.')

const directory = join(workspace, 'desktop/binaries')
await mkdir(directory, { recursive: true })
const staging = await mkdtemp(join(directory, '.bridge-'))
try {
  const candidate = join(staging, 'openpen-mcp-http')
  await buildBridge(workspace, candidate)
  await verifyBridge(candidate, manifest.version)
  await rename(candidate, join(directory, 'openpen-mcp-http-aarch64-apple-darwin'))
} finally {
  await rm(staging, { recursive: true, force: true })
}
