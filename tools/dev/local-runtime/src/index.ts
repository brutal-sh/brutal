import { constants } from 'node:fs'
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readPackageManifest, resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools'

import { publishBridge } from './bridge'
import { buildBridge } from './build'
import { checkLink, installLink } from './links'
import { verifyBridge } from './verify'

if (process.platform === 'win32') throw new Error('This developer installer supports macOS/Linux.')
const workspace = await resolveWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url)))
const agents = join(homedir(), '.local/share/openpen/agents')
const bin = join(homedir(), '.local/bin')
const adapter = join(agents, 'node_modules/.bin/codex-acp')
const legacyBridge = join(workspace, 'packages/mcp/dist/index.mjs')
await checkLink(join(bin, 'codex-acp'), adapter)
const manifest = `${JSON.stringify(
  {
    name: 'openpen-local-agents',
    private: true,
    dependencies: { '@agentclientprotocol/codex-acp': '2.5.0' }
  },
  null,
  2
)}\n`
const manifestPath = join(agents, 'package.json')
await mkdir(agents, { recursive: true })
const existing = await readFile(manifestPath, 'utf8').catch((error: unknown) => {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null
  throw error
})
if (existing !== null && existing !== manifest)
  throw new Error(`Refusing to modify another runtime installation: ${agents}`)
if (existing === null) {
  if ((await readdir(agents)).length > 0)
    throw new Error(`Refusing to use a nonempty unowned runtime directory: ${agents}`)
  await writeFile(manifestPath, manifest, { flag: 'wx' })
}

const install = Bun.spawn(
  [
    'npm',
    'install',
    '--prefix',
    agents,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--registry=https://registry.npmjs.org'
  ],
  { stdout: 'inherit', stderr: 'inherit' }
)
if ((await install.exited) !== 0) throw new Error('The pinned Codex adapter installation failed.')
await access(adapter, constants.X_OK)
await mkdir(bin, { recursive: true })
await installLink(join(bin, 'codex-acp'), adapter)
const staging = await mkdtemp(join(tmpdir(), 'openpen-runtime-build-'))
try {
  const candidate = join(staging, 'openpen-mcp-http')
  const manifest = await readPackageManifest(join(workspace, 'packages/mcp/package.json'))
  if (!manifest.version) throw new Error('The MCP package has no version.')
  await buildBridge(workspace, candidate)
  await verifyBridge(candidate, manifest.version)
  const installed = await publishBridge(
    candidate,
    join(homedir(), '.local/share/openpen/runtime'),
    join(bin, 'openpen-mcp-http'),
    legacyBridge
  )
  console.log(`Verified standalone bridge installed at ${installed}`)
} finally {
  await rm(staging, { recursive: true, force: true })
}
console.log(
  'Installed Codex ACP 2.5.0 and the standalone Open Pen bridge. Launch no longer reads the checkout.'
)
console.log(
  'No credentials or shell profiles were read or changed. Agent login must be verified in the app.'
)
