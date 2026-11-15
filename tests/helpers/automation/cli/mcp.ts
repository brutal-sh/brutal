import { readFile } from 'node:fs/promises'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { parseDiscoveryInfo } from '@open-pencil/mcp/discovery'

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
