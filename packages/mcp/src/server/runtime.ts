import type { WebSocketServer } from 'ws'

import type { createBrowserRPCBridge } from '#mcp/browser-rpc'
import type { buildServerContext } from '#mcp/server/context'
import {
  cleanupDiscovery,
  closeWssGracefully,
  createAppServer,
  teardownListeners,
  type ListenerState
} from '#mcp/server/lifecycle'
import type { createMCPSessionManager } from '#mcp/server/sessions'
import type { ServerHandle } from '#mcp/server/types'

/**
 * Unified runtime shutdown: closes browserRPC, clears MCP sessions,
 * terminates WebSocket clients, closes the WSS, and tears down HTTP
 * listeners. Used by both the startup catch block and ServerHandle.close()
 * to ensure no runtime resources (WebSocket, browserRPC, mcpSessions) are
 * left alive.
 */
export async function shutdownRuntime(
  browserRPC: ReturnType<typeof createBrowserRPCBridge>,
  mcpSessions: ReturnType<typeof createMCPSessionManager>,
  wss: WebSocketServer,
  state: ListenerState
): Promise<void> {
  const errors: unknown[] = []
  try {
    browserRPC.close()
  } catch (e) {
    errors.push(e)
  }
  try {
    await mcpSessions.clear()
  } catch (e) {
    errors.push(e)
  }
  try {
    await closeWssGracefully(wss)
  } catch (e) {
    errors.push(e)
  }
  try {
    await teardownListeners(state)
  } catch (e) {
    errors.push(e)
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'Multiple shutdown errors')
}

export function buildHandle(
  ctx: ReturnType<typeof buildServerContext>,
  state: ListenerState,
  discovery: { socketPath: string | null; httpPort: number; startedAt: string }
): ServerHandle {
  const { app, wss, browserRPC, mcpSessions, authToken } = ctx
  const { socketPath: resolvedSocketPath, httpPort: actualHttpPort, startedAt } = discovery
  // Promise-based lock ensures idempotency even under concurrent calls:
  // the first call creates the teardown promise; subsequent calls return
  // the same promise. JavaScript's event loop guarantees no preemption
  // between the guard check and the assignment.
  let closePromise: Promise<void> | null = null

  async function close() {
    if (closePromise) return closePromise
    closePromise = (async () => {
      const errors: unknown[] = []
      try {
        // Stop advertising this process before the slower WebSocket grace
        // period. This also makes signal-driven shutdown resilient when a
        // parent process exits before all clients finish closing.
        await cleanupDiscovery(authToken, resolvedSocketPath, actualHttpPort, startedAt)
      } catch (error) {
        errors.push(error)
      }
      try {
        await shutdownRuntime(browserRPC, mcpSessions, wss, state)
      } catch (error) {
        errors.push(error)
      }
      if (errors.length === 1) throw errors[0]
      if (errors.length > 1) throw new AggregateError(errors, 'Multiple shutdown errors')
    })()
    return closePromise
  }

  const primary = state.socketResult?.server ?? state.tcpResult?.server ?? createAppServer(app)
  return {
    app,
    server: primary,
    socketPath: resolvedSocketPath,
    httpPort: actualHttpPort,
    close
  }
}
