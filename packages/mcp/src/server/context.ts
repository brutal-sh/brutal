import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

import type { McpServer } from '@modelcontextprotocol/server'
import { WebSocketServer } from 'ws'

import { createBrowserRPCBridge } from '#mcp/browser-rpc'
import { createHonoApp } from '#mcp/server/routes'
import { createMCPSessionManager } from '#mcp/server/sessions'
import type { ServerOptions } from '#mcp/server/types'
import { createToolDescriptors } from '#mcp/tool/manifest'
import type { ToolPolicy } from '#mcp/tool/metadata'
import { applyToolPolicy } from '#mcp/tool/policy'
import { registerTools, type MCPAgentSession, type RPCSender } from '#mcp/tool/registration'
import { scopeRPC } from '#mcp/tool/scope'
import { MCP_VERSION } from '#mcp/version'

function configuration(options: ServerOptions) {
  const httpPort = options.httpPort ?? 7610
  const toolPolicy: ToolPolicy = {
    allowEval: options.enableEval ?? false,
    disabledTools: [...new Set(options.disabledTools)],
    scope: options.scope ?? 'document'
  }
  const mcpRoot = options.mcpRoot ?? null
  // Auto-generated so all transports require auth by default. Override via OPENPENCIL_MCP_AUTH_TOKEN or authToken option.
  // Pass authToken: null explicitly to disable auth entirely.
  const authToken =
    options.authToken === undefined ? randomBytes(16).toString('hex') : options.authToken
  const withTcp = options.withTcp ?? false

  // Warn if auth is disabled while TCP is active — any local process can
  // interact with the server without authentication. Socket-only transport
  // (PORT=0) is safer because 0o600 permissions restrict access to the
  // same OS user.
  if (authToken === null && withTcp) {
    process.stderr.write(
      `WARNING: MCP server is running without authentication on TCP port ${httpPort}. ` +
        'Any local process can interact with the server. ' +
        'Set OPENPENCIL_MCP_AUTH_TOKEN to enable auth, or use PORT=0 for socket-only transport.\n'
    )
  }

  return { httpPort, toolPolicy, mcpRoot, authToken, withTcp }
}

function sessionsFor(options: ServerOptions, toolPolicy: ToolPolicy, sendToBrowser: RPCSender) {
  const mcpRoot = options.mcpRoot ?? null
  return createMCPSessionManager({
    serverVersion: MCP_VERSION,
    sessionIdleTimeoutMs: options.sessionIdleTimeoutMs,
    registerTools: (mcpServer: McpServer, agentSession: MCPAgentSession, onToolSettled) =>
      registerTools(mcpServer, {
        policy: toolPolicy,
        mcpRoot,
        sendRPC: sendToBrowser,
        agentSession,
        onToolSettled
      }),
    onSessionOpened: ({ id, kind, chat }) => {
      sendToBrowser({ command: 'agent_session_opened', args: { session: id, kind, chat } }).catch(
        () => undefined
      )
    },
    onSessionClosed: (sessionId) => {
      // Best-effort: the app may be gone already, and then it shows no agents anyway.
      sendToBrowser({ command: 'agent_session_closed', args: { session: sessionId } }).catch(
        () => undefined
      )
    }
  })
}

export function buildServerContext(options: ServerOptions) {
  const { httpPort, toolPolicy, mcpRoot, authToken, withTcp } = configuration(options)
  const mcpSessions = sessionsFor(options, toolPolicy, (body, request) =>
    sendToBrowser(body, request)
  )
  const browserRPC = createBrowserRPCBridge({
    authToken,
    onConnectionChange: mcpSessions.notifyToolsChanged,
    appWaitTimeoutMs: options.appWaitTimeoutMs
  })
  // Every call into the app, from MCP sessions and /rpc alike, stays within the scope.
  const sendToBrowser = scopeRPC(browserRPC.sendRPC, toolPolicy.scope)
  const toolDescriptors = applyToolPolicy(createToolDescriptors(mcpRoot !== null, true), toolPolicy)

  const app = createHonoApp({
    authToken,
    corsOrigin: options.corsOrigin ?? null,
    // A client limited to the selection reaches no files, as the file tools are left out then.
    fileRoot: mcpRoot !== null && toolPolicy.scope !== 'selection' ? resolve(mcpRoot) : null,
    browserRPC,
    mcpSessions,
    sendToBrowser,
    toolDescriptors
  })
  const wss = new WebSocketServer({ noServer: true })

  return {
    httpPort,
    withTcp,
    mcpSessions,
    browserRPC,
    sendToBrowser,
    app,
    wss,
    authToken,
    disabledTools: toolPolicy.disabledTools,
    scope: toolPolicy.scope
  }
}
