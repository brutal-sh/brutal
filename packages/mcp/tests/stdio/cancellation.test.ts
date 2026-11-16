import { expect, test } from 'bun:test'
import { writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'

import * as v from 'valibot'

import { createStdioRPCBridge } from '#mcp/stdio/bridge'
import { getDiscoveryPath } from '#mcp/transport/paths'

const requestSchema = v.pipe(v.string(), v.parseJson(), v.object({ command: v.string() }))

function ownedServer() {
  let health = 0
  const commands: string[] = []
  let entered: (() => void) | undefined
  const dispatched = new Promise<void>((resolve) => {
    entered = resolve
  })
  const server = createServer((req, res) => {
    if (req.url === '/health') {
      health++
      res.end(JSON.stringify({ status: 'ok' }))
      return
    }
    let input = ''
    req.on('data', (data: Buffer) => {
      input += data.toString()
    })
    req.on('end', () => {
      const { command } = v.parse(requestSchema, input)
      commands.push(command)
      if (command === 'owned-cancel') {
        entered?.()
        return
      }
      res.end(JSON.stringify({ ok: true, result: command }))
    })
  })
  return { server, commands, dispatched, health: () => health }
}

async function fixture() {
  const { server, commands, dispatched, health } = ownedServer()
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing owned listener')
  await writeFile(
    await getDiscoveryPath(),
    JSON.stringify({
      pid: process.pid,
      httpPort: address.port,
      socketPath: null,
      authToken: 'owned-token',
      authRequired: true,
      version: '0.0.0',
      startedAt: new Date().toISOString()
    }),
    { mode: 0o600 }
  )
  let reconnected = 0
  const bridge = createStdioRPCBridge({
    onReconnect: () => {
      reconnected++
    }
  })
  return {
    bridge,
    dispatched,
    commands,
    health,
    reconnected: () => reconnected,
    close: async () => {
      bridge.close()
      const closed = new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
      server.closeAllConnections()
      await closed
    }
  }
}

test('stdio caller cancellation never reconnects, retries, or invalidates the healthy connection', async () => {
  const owned = await fixture()
  const controller = new AbortController()
  try {
    const pending = owned.bridge.sendRPC({ command: 'owned-cancel' }, { signal: controller.signal })
    await owned.dispatched
    controller.abort()
    await expect(pending).rejects.toThrow()
    await expect(
      owned.bridge.sendRPC({ command: 'owned-preabort' }, { signal: controller.signal })
    ).rejects.toThrow()
    expect(await owned.bridge.sendRPC({ command: 'owned-retry' })).toEqual({
      ok: true,
      result: 'owned-retry'
    })
    expect(owned.commands).toEqual(['owned-cancel', 'owned-retry'])
    expect(owned.health()).toBe(1)
    expect(owned.reconnected()).toBe(0)
  } finally {
    controller.abort()
    await owned.close()
  }
})
