import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, sep } from 'node:path'

import { expect, type Page } from '@playwright/test'
import * as v from 'valibot'

import { parseDiscoveryInfo } from '@open-pencil/mcp/discovery'

const healthSchema = v.object({
  status: v.picklist(['ok', 'no_app'])
})

async function assertDiscoveryIdentity(path: string, port: number): Promise<void> {
  const info = parseDiscoveryInfo(await readFile(path, 'utf8'))
  if (!info || info.httpPort !== port || info.scope !== 'document' || !info.authRequired)
    throw new Error('Test MCP identity or scope mismatch')
  process.kill(info.pid, 0)
}

/** Reach only the canonical test server's private discovery file, never the user profile. */
export async function liveTestDiscovery(page: Page): Promise<string> {
  const port = Number(process.env.OPENPENCIL_TEST_MCP_PORT ?? '7600')
  await expect
    .poll(async () => {
      const response = await page.request.get(`http://127.0.0.1:${port}/health`)
      const result = v.safeParse(
        v.pipe(v.string(), v.parseJson(), healthSchema),
        await response.text()
      )
      if (!result.success) return 'invalid'
      return result.output.status
    })
    .toBe('ok')
  // The Vite plugin owns a port-scoped private runtime; /health does not expose its path.
  const runtimeId = createHash('sha256').update(`localhost-${port}`).digest('hex').slice(0, 16)
  const discoveryPath = join(tmpdir(), 'open-pencil-mcp', runtimeId, 'mcp.json')
  const root = await realpath(join(tmpdir(), 'open-pencil-mcp'))
  const path = await realpath(discoveryPath)
  const local = relative(root, path)
  if (isAbsolute(local) || local.split(sep).includes('..'))
    throw new Error('Discovery is outside the test MCP runtime root')
  const file = await lstat(discoveryPath)
  if (!file.isFile() || file.isSymbolicLink() || (file.mode & 0o777) !== 0o600)
    throw new Error('Test discovery must be a private regular file')
  await assertDiscoveryIdentity(path, port)
  return path
}
