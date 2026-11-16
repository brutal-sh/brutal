import type { WebSocketServer, WebSocket } from 'ws'

import type { createBrowserRPCBridge } from '#mcp/browser-rpc'

const HEARTBEAT_INTERVAL_MS = 5_000

/** Set up shared WebSocket connection handling and heartbeat. Call once. */
export function wireConnectionHandling(
  wss: WebSocketServer,
  browserRPC: ReturnType<typeof createBrowserRPCBridge>
) {
  const alive = new WeakMap<WebSocket, boolean>()

  wss.on('connection', (ws: WebSocket) => {
    alive.set(ws, true)
    browserRPC.handleConnection(ws)

    ws.on('pong', () => alive.set(ws, true))
    ws.on('message', (raw) => {
      alive.set(ws, true)
      const data = typeof raw === 'string' ? raw : Buffer.from(raw as Buffer).toString('utf-8')
      browserRPC.handleMessage(data, ws)
    })

    ws.on('close', () => {
      browserRPC.handleClose(ws)
    })

    ws.on('error', () => {
      try {
        ws.terminate()
      } catch {
        alive.delete(ws)
      }
    })
  })

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        try {
          ws.terminate()
        } catch {
          continue
        }
        continue
      }
      alive.set(ws, false)
      try {
        ws.ping()
      } catch {
        continue
      }
    }
  }, HEARTBEAT_INTERVAL_MS)
  heartbeat.unref()
  wss.on('close', () => clearInterval(heartbeat))
}
