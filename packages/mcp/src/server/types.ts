import type { Server as HttpServer } from 'node:http'

import type { Hono } from 'hono'

import type { MCPToolScope } from '#mcp/tool/scope'

export interface ServerOptions {
  /** TCP port for the HTTP + WebSocket server. Ignored when `withTcp` is false. When set to 0 with `withTcp: true`, binds to an ephemeral port. Defaults to 7610. */
  httpPort?: number
  /** Path to the Unix domain socket. Auto-resolved if omitted. */
  socketPath?: string | null
  /** Whether to also listen on TCP (in addition to the socket). API default is `false`; the CLI passes `true` by default (derived from PORT, default 7610). */
  withTcp?: boolean
  enableEval?: boolean
  /** Tool names omitted from every MCP session. */
  disabledTools?: Iterable<string>
  /** What clients can reach: the whole document (default) or only the user's selection. */
  scope?: MCPToolScope
  mcpRoot?: string | null
  /** Auth token for /mcp and /rpc endpoints. Auto-generated (32-hex) when omitted. Pass null explicitly to disable auth. */
  authToken?: string | null
  corsOrigin?: string | readonly string[] | null
  /**
   * If set, the server starts a grace-period timer while no app is attached.
   * The timer closes the server and removes its discovery file unless an app
   * registers before it expires. A later app disconnect starts a new grace
   * period, which lets app-spawned servers survive brief reloads while still
   * cleaning up after renderer or process crashes. Undefined/0 disables the
   * watchdog — the default, since a bare CLI invocation for manual testing
   * should not self-terminate just because nobody connected yet. The desktop
   * app opts in when it spawns the server.
   */
  appAttachTimeoutMs?: number
  /**
   * How long an MCP session may sit without requests before it is closed.
   * Defaults to 15 minutes; 0 disables expiration. An open GET/SSE stream
   * does not count as activity.
   */
  sessionIdleTimeoutMs?: number
  /**
   * How long a tool call waits for the app to register before it fails with
   * APP_NOT_CONNECTED. Defaults to 10 s so a stdio bridge started slightly
   * before the desktop app still succeeds; tests shorten it.
   */
  appWaitTimeoutMs?: number
}

export interface ServerHandle {
  /** The Hono app (routes) */
  app: Hono
  /** The primary Node.js HTTP server (socket listener if present, otherwise TCP) */
  server: HttpServer
  /** Resolved socket path (null if not listening on socket) */
  socketPath: string | null
  /** TCP port the server is listening on (0 if TCP is disabled) */
  httpPort: number
  /** Shut down the server: close listeners, remove socket and discovery files */
  close: () => Promise<void>
}
