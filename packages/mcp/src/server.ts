import { wireConnectionHandling } from '#mcp/server/connections'
import { buildServerContext } from '#mcp/server/context'
import {
  startSocketListener,
  tryStartTcp,
  tryWriteDiscovery,
  type ListenerState
} from '#mcp/server/lifecycle'
import { buildHandle, shutdownRuntime } from '#mcp/server/runtime'
import type { ServerHandle, ServerOptions } from '#mcp/server/types'
import { armAppAttachWatchdog, validateTimeoutOption } from '#mcp/server/watchdog'
import { MCP_VERSION } from '#mcp/version'

export { MCP_VERSION } from '#mcp/version'
export type { ServerOptions, ServerHandle } from '#mcp/server/types'
export { fail, ok, type MCPContent, type MCPResult } from '#mcp/result'
export {
  MCP_AGENT_KINDS,
  registerTools,
  type MCPAgentKind,
  type MCPAgentSession,
  type RegisterToolsOptions,
  type RPCSender
} from '#mcp/tool/registration'

async function listen(
  ctx: ReturnType<typeof buildServerContext>,
  state: ListenerState,
  options: ServerOptions
) {
  let startedAt: string
  try {
    state.socketResult = await startSocketListener(ctx.app, ctx.wss, options.socketPath ?? null)
    state.tcpResult = ctx.withTcp ? await tryStartTcp(ctx.app, ctx.wss, ctx.httpPort, state) : null
    const resolvedSocketPath = state.socketResult?.resolvedPath ?? null
    const actualHttpPort = state.tcpResult?.port ?? 0

    if (!resolvedSocketPath && !actualHttpPort) {
      throw new Error(
        'MCP server has no active listeners (both socket and TCP are unavailable). ' +
          'Ensure Unix domain sockets are supported on this platform or enable TCP with withTcp: true.'
      )
    }

    startedAt = await tryWriteDiscovery(
      resolvedSocketPath,
      actualHttpPort,
      ctx.authToken,
      MCP_VERSION,
      ctx.disabledTools,
      ctx.scope,
      state
    )
  } catch (err) {
    // Tear down any listeners that started before the failure, then close
    // all resources so nothing leaks when startServer rejects.
    await shutdownRuntime(ctx.browserRPC, ctx.mcpSessions, ctx.wss, state).catch(() => undefined)
    throw err
  }
  return startedAt
}

export async function startServer(options: ServerOptions = {}): Promise<ServerHandle> {
  validateTimeoutOption('appAttachTimeoutMs', options.appAttachTimeoutMs)
  validateTimeoutOption('appWaitTimeoutMs', options.appWaitTimeoutMs)
  validateTimeoutOption('sessionIdleTimeoutMs', options.sessionIdleTimeoutMs)
  const ctx = buildServerContext(options)

  // Wire shared connection handling BEFORE starting listeners so that
  // any client connecting during startup is handled immediately.
  wireConnectionHandling(ctx.wss, ctx.browserRPC)

  const state: ListenerState = { socketResult: null, tcpResult: null }
  const startedAt = await listen(ctx, state, options)

  const resolvedSocketPath = state.socketResult?.resolvedPath ?? null
  const actualHttpPort = state.tcpResult?.port ?? 0

  const handle = buildHandle(ctx, state, {
    socketPath: resolvedSocketPath,
    httpPort: actualHttpPort,
    startedAt
  })

  armAppAttachWatchdog(options.appAttachTimeoutMs, ctx.browserRPC, handle)

  return handle
}
