import { readFile } from 'node:fs/promises'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

import { parseDiscoveryInfo } from '@open-pencil/mcp/discovery'

import { repoPath } from '#tests/helpers/paths'

/** Use only a discovery path already verified by liveTestDiscovery. */
export async function connectOwnedMCP(discoveryPath: string) {
  const info = parseDiscoveryInfo(await readFile(discoveryPath, 'utf8'))
  const port = Number(process.env.OPENPENCIL_TEST_MCP_PORT ?? '7600')
  if (!info || info.httpPort !== port || info.scope !== 'document' || !info.authToken)
    throw new Error('Owned MCP test identity mismatch')
  process.kill(info.pid, 0)
  const client = new Client({ name: 'owned-app-state-client', version: '0.0.0' })
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${info.authToken}` } }
      })
    )
    return client
  } catch (error) {
    await client.close()
    throw error
  }
}

/** Actual Node executable and built stdio entry; no global discovery or credentials. */
export async function connectOwnedStdioMCP(discoveryPath: string, args: string[] = []) {
  const env: Record<string, string> = {}
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith('OPENPENCIL_MCP_') && value !== undefined) env[name] = value
  }
  env.OPENPENCIL_MCP_DISCOVERY_PATH = discoveryPath
  env.OPENPENCIL_MCP_ROOT = repoPath()
  env.OPENPENCIL_MCP_EVAL = '0'
  const client = new Client({ name: 'owned-cancellation-stdio-client', version: '0.0.0' })
  try {
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [repoPath('packages/mcp/dist/stdio.mjs'), ...args],
        env,
        stderr: 'pipe'
      })
    )
    return client
  } catch (error) {
    await client.close()
    throw error
  }
}
