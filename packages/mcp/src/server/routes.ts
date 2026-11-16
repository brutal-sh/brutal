import { Hono, type Context, type Next } from 'hono'
import { cors } from 'hono/cors'

import { MCP_AGENT_HEADER, MCP_CHAT_HEADER } from '@open-pencil/core/constants'

import { bearerToken, isAuthorized, mcpRequestToken } from '#mcp/auth'
import type { createBrowserRPCBridge } from '#mcp/browser-rpc'
import { MCP_CORS_HEADERS, MCP_CORS_METHODS, MCP_EXPOSED_HEADERS } from '#mcp/http-options'
import type { RPCJSONObject } from '#mcp/json'
import { registerFileRoutes } from '#mcp/server/files'
import { mcpInstallCommand } from '#mcp/server/install'
import { sessionOpener, type createMCPSessionManager } from '#mcp/server/sessions'
import type { ToolDescriptor } from '#mcp/tool/metadata'
import type { RPCSender } from '#mcp/tool/registration'
import { MCP_VERSION } from '#mcp/version'

const MCP_METHODS: readonly string[] = ['GET', 'POST', 'DELETE']

/** Set up Hono routes: /health, /rpc, /files, /mcp */
interface AppOptions {
  authToken: string | null
  corsOrigin: string | readonly string[] | null
  /** The root `/files` reads and writes inside, or null to leave the route out. */
  fileRoot: string | null
  browserRPC: ReturnType<typeof createBrowserRPCBridge>
  mcpSessions: ReturnType<typeof createMCPSessionManager>
  sendToBrowser: RPCSender
  toolDescriptors: ToolDescriptor[]
}

export function createHonoApp(options: AppOptions): Hono {
  const { authToken, corsOrigin, browserRPC } = options
  const { toolDescriptors } = options

  const app = new Hono()

  if (corsOrigin) {
    app.use(
      '*',
      cors({
        origin: typeof corsOrigin === 'string' ? corsOrigin : [...corsOrigin],
        allowMethods: MCP_CORS_METHODS,
        allowHeaders: MCP_CORS_HEADERS,
        exposeHeaders: MCP_EXPOSED_HEADERS
      })
    )
  }

  app.get('/health', async (c) => {
    const provided = bearerToken(c.req.header('authorization'))
    const canInspectConfiguration = authToken === null || isAuthorized(provided, authToken)
    return c.json({
      status: browserRPC.isConnected() ? 'ok' : 'no_app',
      version: MCP_VERSION,
      installCommand: await mcpInstallCommand(),
      authRequired: authToken !== null,
      // Tells the app it reports agent_session_opened, so a chat may wait for its agent.
      agentSessionEvents: true,
      ...(canInspectConfiguration ? { tools: toolDescriptors } : {})
    })
  })

  registerProtectedRoutes(app, options)

  app.all('/mcp', (c) => handleMCP(c, options))

  return app
}

async function existingSession(
  c: Context,
  sessionId: string,
  mcpSessions: AppOptions['mcpSessions']
) {
  // Never allocate a session for an unknown ID: DELETE or a stale client
  // would burn a slot it can never use.
  const existing = mcpSessions.getExistingTransport(sessionId)
  if ('error' in existing) {
    if (existing.error === 'closed') {
      return c.json({ error: 'MCP server is shutting down' }, 503)
    }
    return c.json({ error: 'MCP session not found' }, 404)
  }
  if (c.req.method !== 'DELETE') return existing.handleRequest(c.req.raw)
  try {
    return await existing.handleRequest(c.req.raw)
  } finally {
    await mcpSessions.deleteSession(sessionId)
  }
}

async function initializeSession(c: Context, mcpSessions: AppOptions['mcpSessions']) {
  // Only an initializing POST may start a session.
  if (c.req.method !== 'POST') {
    return c.json({ error: 'Missing MCP session id' }, 400)
  }
  const transport = await mcpSessions.resolveTransport(
    undefined,
    sessionOpener(c.req.header(MCP_AGENT_HEADER), c.req.header(MCP_CHAT_HEADER))
  )
  if ('error' in transport) {
    if (transport.error === 'closed') {
      return c.json({ error: 'MCP server is shutting down' }, 503)
    }
    return c.json(
      { error: 'Too many active MCP sessions' },
      { status: 503, headers: { 'Retry-After': '5' } }
    )
  }
  return transport.handleRequest(c.req.raw)
}

async function handleMCP(c: Context, options: AppOptions) {
  const { authToken, mcpSessions } = options
  if (authToken !== null) {
    const token = mcpRequestToken(c.req.header('authorization'), c.req.header('x-mcp-token'))
    if (!isAuthorized(token, authToken)) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }
  if (!MCP_METHODS.includes(c.req.method)) {
    return c.json(
      { error: 'Method not allowed' },
      { status: 405, headers: { Allow: MCP_METHODS.join(', ') } }
    )
  }
  const sessionId = c.req.header('mcp-session-id')
  return sessionId ? existingSession(c, sessionId, mcpSessions) : initializeSession(c, mcpSessions)
}

function registerProtectedRoutes(app: Hono, options: AppOptions) {
  const { authToken, fileRoot, sendToBrowser } = options
  const requireToken = async (c: Context, next: Next) => {
    // When authToken is null (operator explicitly disabled auth), skip token check —
    // the Unix socket or localhost TCP already restricts access to local processes.
    if (authToken !== null) {
      const provided = bearerToken(c.req.header('authorization'))
      if (!isAuthorized(provided, authToken)) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
    }
    return next()
  }

  app.use('/rpc', requireToken)

  if (fileRoot !== null) {
    app.use('/files/*', requireToken)
    registerFileRoutes(app, fileRoot)
  }

  // Historical note: before the isConnected() guard was removed, a disconnected
  // app returned 503 here. Now errors from sendToBrowser surface as 502. This
  // is a semantic shift from 503 → 502; callers that distinguished 503 may
  // need to handle 502 equivalently.
  app.post('/rpc', async (c) => {
    const body = await c.req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: 'Invalid request body' }, 400)
    }
    try {
      const result = await sendToBrowser(body as RPCJSONObject, { signal: c.req.raw.signal })
      return c.json(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return c.json({ ok: false, error: msg }, 502)
    }
  })
}
