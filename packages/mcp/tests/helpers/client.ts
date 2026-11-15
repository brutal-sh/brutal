import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { randomHex } from '@open-pencil/scene-graph/random'

import { startServer, type ServerHandle } from '#mcp/server'
import type { MCPToolScope } from '#mcp/tool/scope'

export async function ownedClient(
  options: { scope?: MCPToolScope; disabledTools?: string[] } = {}
) {
  const token = randomHex(32)
  const root = await mkdtemp(join(tmpdir(), 'open-pen-resource-mcp-'))
  const client = new Client({ name: 'owned-resource-client', version: '0.0.0' })
  let server: ServerHandle | undefined
  try {
    server = await startServer({
      socketPath: process.platform === 'win32' ? null : join(root, 'mcp.sock'),
      withTcp: true,
      httpPort: 0,
      authToken: token,
      mcpRoot: null,
      appWaitTimeoutMs: 1,
      enableEval: false,
      disabledTools: options.disabledTools ?? [],
      scope: options.scope ?? 'document'
    })
    const ownedServer = server
    const close = () =>
      client
        .close()
        .finally(() =>
          ownedServer.close().finally(() => rm(root, { recursive: true, force: true }))
        )
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${server.httpPort}/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${token}` } } }
    )
    await client.connect(transport)
    return { client, close }
  } catch (error) {
    await client
      .close()
      .finally(() => server?.close())
      .finally(() => rm(root, { recursive: true, force: true }))
    throw error
  }
}
