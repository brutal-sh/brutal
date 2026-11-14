import { expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runNodeCLI } from '#cli-tests/helpers/process'
import * as v from 'valibot'

import type { DiscoveryInfo } from '@open-pencil/mcp/discovery'

import { createAppConnection } from '#cli/app/client'
import { createInteractiveAppSession } from '#cli/interactive/app'

const requestSchema = v.pipe(v.string(), v.parseJson(), v.object({ command: v.string() }))

async function fixture(respond: (response: ServerResponse) => void) {
  const commands: string[] = []
  const server = createServer((request, response) => {
    let body = ''
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    request.on('end', () => {
      commands.push(v.parse(requestSchema, body).command)
      respond(response)
    })
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const dir = await mkdtemp(join(tmpdir(), 'open-pen-connection-'))
  const path = join(dir, 'mcp.json')
  const previous = process.env.OPENPENCIL_MCP_DISCOVERY_PATH
  process.env.OPENPENCIL_MCP_DISCOVERY_PATH = path
  const info: DiscoveryInfo = {
    pid: process.pid,
    socketPath: join(dir, 'missing.sock'),
    httpPort: (server.address() as AddressInfo).port,
    authRequired: true,
    authToken: 'owned-connection-test-token',
    version: '0.0.0-test',
    startedAt: new Date().toISOString()
  }
  const write = (value: DiscoveryInfo) => writeFile(path, JSON.stringify(value), { mode: 0o600 })
  await write(info)
  return {
    info,
    write,
    received: () => commands.length,
    commands: () => [...commands],
    async cleanup() {
      if (previous === undefined) delete process.env.OPENPENCIL_MCP_DISCOVERY_PATH
      else process.env.OPENPENCIL_MCP_DISCOVERY_PATH = previous
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
      await rm(dir, { recursive: true, force: true })
    }
  }
}

test('a persistent session refuses a changed app identity before sending another command', async () => {
  const owned = await fixture((response) =>
    response.end(JSON.stringify({ ok: true, result: { connected: true } }))
  )
  try {
    const request = await createAppConnection()
    expect((await request('list_documents')).result).toEqual({ connected: true })
    await owned.write({ ...owned.info, startedAt: 'replaced-owned-app' })
    await expect(request('tool', { name: 'create_shape' })).rejects.toThrow('connection changed')
    expect(owned.received()).toBe(1)
  } finally {
    await owned.cleanup()
  }
})

test('a connection lost after delivery does not replay the uncertain command', async () => {
  const owned = await fixture((response) => response.destroy())
  try {
    const request = await createAppConnection()
    await expect(request('tool', { name: 'create_shape' })).rejects.toThrow()
    expect(owned.received()).toBe(1)
  } finally {
    await owned.cleanup()
  }
})

test('a persistent session refuses stale authentication without rediscovery or replay', async () => {
  const owned = await fixture((response) => {
    response.writeHead(401)
    response.end(JSON.stringify({ error: 'Unauthorized' }))
  })
  try {
    const request = await createAppConnection()
    await expect(request('tool', { name: 'create_shape' })).rejects.toThrow('Unauthorized')
    expect(owned.received()).toBe(1)
  } finally {
    await owned.cleanup()
  }
})

test.each([undefined, false, 'true'])(
  'interactive startup refuses unsafe identity metadata %p before opening a file',
  async (metadata) => {
    const documents = [
      {
        id: 'tab-1',
        name: 'Older owned app',
        active: true,
        current_page_id: '0:1',
        current_page_name: 'Page 1',
        pages: [{ id: '0:1', name: 'Page 1' }]
      }
    ]
    const owned = await fixture((response) =>
      response.end(
        JSON.stringify({ ok: true, result: { documents, unique_document_ids: metadata } })
      )
    )
    try {
      await expect(
        createInteractiveAppSession({ input: 'owned input not opened.pen' })
      ).rejects.toThrow('safe document identities')
      expect(owned.received()).toBe(1)
      expect(owned.commands()).toEqual(['list_documents'])
      const node = await runNodeCLI(
        ['interactive', '--app', 'desktop', '--in', 'owned input not opened.pen'],
        { stdin: 'exit()\n' }
      )
      expect(node.exitCode).toBe(1)
      expect(node.stderr).toContain('safe document identities')
      expect(owned.commands()).toEqual(['list_documents', 'list_documents'])
    } finally {
      await owned.cleanup()
    }
  }
)
