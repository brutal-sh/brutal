import { randomUUID } from 'node:crypto'

import * as v from 'valibot'
import type { WebSocket } from 'ws'

import { isAuthorized } from '#mcp/auth'
import { stripEnvelope, responsePayload, sendJSON } from '#mcp/browser-rpc/messages'
import {
  browserEnvelopeSchema,
  handshakeMessageSchema,
  requestMessageSchema,
  responseMessageSchema
} from '#mcp/browser-rpc/schema'
import type { PendingRequest } from '#mcp/rpc-types'

const RPC_TIMEOUT = 20_000
const APP_WAIT_TIMEOUT = 10_000

const APP_NOT_CONNECTED_MESSAGE =
  'Open Pen app is not connected. STOP and tell the user: "The Open Pen desktop app is not running, no document is open, or the desktop app is connected to a different MCP server. Please start Open Pen, open a document, and try again." Do NOT attempt to start the app yourself or retry automatically.'

type BrowserRPCBridgeOptions = {
  authToken: string | null
  onConnectionChange: () => void
  /** How long an RPC waits for the app to register before failing with APP_NOT_CONNECTED. Defaults to 10 s. */
  appWaitTimeoutMs?: number
}

type ConnectionListener = (connected: boolean) => void

class BrowserRPCBridge {
  constructor(private readonly options: BrowserRPCBridgeOptions) {}
  private get appWaitTimeoutMs() {
    return this.options.appWaitTimeoutMs ?? APP_WAIT_TIMEOUT
  }
  private readonly pending = new Map<string, PendingRequest>()
  private readonly clients = new Set<WebSocket>()
  private readonly connectionWaiters = new Set<PendingRequest>()
  // Track which WebSocket clients have authenticated via a valid
  // register message. Unauthenticated clients can only send register;
  // all other message types (request, response) are rejected.
  private readonly authenticatedClients = new Set<WebSocket>()
  private readonly connectionListeners = new Set<ConnectionListener>()
  private browserWs: WebSocket | null = null
  private browserRegistered = false
  private bridgeClosed = false

  private canSend = (): boolean =>
    Boolean(
      this.browserWs && this.browserWs.readyState === this.browserWs.OPEN && this.browserRegistered
    )

  isConnected = (): boolean => {
    return Boolean(this.browserWs && this.browserRegistered)
  }

  private notifyConnectionChange = () => {
    this.options.onConnectionChange()
    const connected = this.isConnected()
    for (const listener of this.connectionListeners) listener(connected)
  }

  subscribeConnectionChange = (listener: ConnectionListener): (() => void) => {
    this.connectionListeners.add(listener)
    listener(this.isConnected())
    return () => this.connectionListeners.delete(listener)
  }

  private notifyConnectionWaiters = () => {
    for (const waiter of this.connectionWaiters) {
      clearTimeout(waiter.timer)
      waiter.resolve(undefined)
    }
    this.connectionWaiters.clear()
  }

  private rejectConnectionWaiters = (reason: string) => {
    for (const waiter of this.connectionWaiters) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error(reason))
    }
    this.connectionWaiters.clear()
  }

  private waitForConnection = (signal?: AbortSignal): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer)
        this.connectionWaiters.delete(waiter)
        signal?.removeEventListener('abort', abort)
      }
      const fail = (error: Error) => {
        cleanup()
        reject(error)
      }
      const abort = () =>
        fail(signal?.reason instanceof Error ? signal.reason : new Error('RPC cancelled'))
      const timer = setTimeout(
        () => fail(new Error(APP_NOT_CONNECTED_MESSAGE)),
        this.appWaitTimeoutMs
      )
      const waiter: PendingRequest = {
        resolve: () => {
          cleanup()
          resolve()
        },
        reject: fail,
        timer
      }
      this.connectionWaiters.add(waiter)
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
      else if (this.canSend()) waiter.resolve(undefined)
    })
  }

  private rejectAllPending = (reason: string) => {
    for (const [, req] of this.pending) {
      clearTimeout(req.timer)
      req.reject(new Error(reason))
    }
    this.pending.clear()
  }

  private sendRegisterPrompt = (ws: WebSocket) => {
    // Send a prompt inviting the client to register as the browser.
    // IMPORTANT: Do NOT include the auth token here. On TCP, any local
    // process can connect via WebSocket — sending the secret token would
    // leak credentials to unauthenticated clients. The legitimate browser
    // app already knows the token (from the discovery file or Vite env)
    // and sends it proactively in its ws.onopen handler. The token field
    // is set to null to signal that auth is required without revealing
    // the secret. When auth is disabled (authToken === null), null is
    // still correct — it means "no token needed."
    sendJSON(ws, { type: 'register', token: null })
  }

  private broadcastRegisterPrompt = () => {
    for (const client of this.clients) this.sendRegisterPrompt(client)
  }

  sendRPC = async (
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ): Promise<unknown> => {
    const signal = options?.signal
    signal?.throwIfAborted()
    if (this.bridgeClosed) throw new Error('Server shutting down')
    if (!this.canSend()) await this.waitForConnection(signal)
    signal?.throwIfAborted()
    const ws = this.browserWs
    if (!ws || ws.readyState !== ws.OPEN || !this.browserRegistered)
      throw new Error(APP_NOT_CONNECTED_MESSAGE)
    return this.sendRequest(ws, body, signal)
  }

  private sendRequest = (
    ws: WebSocket,
    body: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const id = randomUUID()
      const cleanup = () => {
        clearTimeout(timer)
        this.pending.delete(id)
        signal?.removeEventListener('abort', abort)
      }
      const succeed = (value: unknown) => {
        cleanup()
        resolve(value)
      }
      const fail = (error: Error) => {
        cleanup()
        reject(error)
      }
      const abort = () => {
        if (!this.pending.has(id)) return
        fail(signal?.reason instanceof Error ? signal.reason : new Error('RPC cancelled'))
        sendJSON(ws, { type: 'cancel', id })
      }
      const timer = setTimeout(
        () => fail(new Error(`RPC timeout (${Math.round(RPC_TIMEOUT / 1000)}s)`)),
        RPC_TIMEOUT
      )
      this.pending.set(id, { resolve: succeed, reject: fail, timer })
      signal?.addEventListener('abort', abort, { once: true })
      try {
        signal?.throwIfAborted()
        ws.send(JSON.stringify({ ...body, type: 'request', id }))
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  private handleClientRequest = async (
    ws: WebSocket,
    msg: v.InferOutput<typeof requestMessageSchema>
  ) => {
    try {
      const result = await this.sendRPC(stripEnvelope(msg))
      sendJSON(ws, { ...responsePayload(result), type: 'response', id: msg.id, ok: true })
    } catch (e) {
      sendJSON(ws, {
        type: 'response',
        id: msg.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e)
      })
    }
  }

  private registerBrowser = (ws: WebSocket, token: string | null) => {
    if (this.bridgeClosed) return
    if (!isAuthorized(token, this.options.authToken)) {
      ws.close()
      return
    }
    // Mark this client as authenticated — it can now send requests.
    this.authenticatedClients.add(ws)
    const previousBrowserWs = this.browserWs
    this.browserWs = ws
    this.browserRegistered = true
    if (previousBrowserWs && previousBrowserWs !== ws) {
      // Reject in-flight requests to the old browser. Without this, pending
      // requests sit in the pending map until RPC_TIMEOUT (20s), because
      // handleClose for the old socket returns early (browserWs is already
      // set to the new socket, so browserWs !== previousBrowserWs).
      this.rejectAllPending('Browser reconnected')
      if (previousBrowserWs.readyState === ws.OPEN) {
        previousBrowserWs.close()
      }
    }
    this.notifyConnectionWaiters()
    this.notifyConnectionChange()
    this.broadcastRegisterPrompt()
  }

  private handleBrowserResponse = (
    msg: v.InferOutput<typeof responseMessageSchema>,
    ws: WebSocket
  ) => {
    if (!this.browserRegistered || this.browserWs !== ws) return
    const req = this.pending.get(msg.id)
    if (!req) return
    this.pending.delete(msg.id)
    clearTimeout(req.timer)
    if (msg.ok === false) {
      req.reject(new Error(msg.error ?? 'RPC failed'))
    } else {
      req.resolve(stripEnvelope(msg))
    }
  }

  private handleHandshake = (msg: Record<string, unknown>, ws: WebSocket) => {
    const handshake = v.safeParse(handshakeMessageSchema, msg)
    if (!handshake.success) {
      ws.close()
      return
    }
    const { token } = handshake.output
    if (token === undefined) return
    if (msg.type === 'register') {
      this.registerBrowser(ws, token)
    } else if (isAuthorized(token, this.options.authToken)) {
      this.authenticatedClients.add(ws)
    } else {
      ws.close()
    }
  }

  handleMessage = (data: string, ws: WebSocket) => {
    if (this.bridgeClosed) return
    const envelope = v.safeParse(browserEnvelopeSchema, data)
    if (!envelope.success) {
      if (envelope.issues.some((issue) => issue.type === 'parse_json')) {
        console.warn('Malformed automation message:', v.summarize(envelope.issues))
      } else {
        ws.close()
      }
      return
    }
    const msg = envelope.output

    if (msg.type === 'auth' || msg.type === 'register') {
      this.handleHandshake(msg, ws)
      return
    }
    // All non-register messages require authentication. Without this
    // check, an unauthenticated WebSocket client (that hasn't sent a
    // valid register message) could bypass the HTTP auth on /rpc by
    // sending request messages over the WebSocket directly.
    if (!this.authenticatedClients.has(ws)) {
      ws.close()
      return
    }
    const request = v.safeParse(requestMessageSchema, msg)
    if (request.success) {
      void this.handleClientRequest(ws, request.output)
      return
    }
    const response = v.safeParse(responseMessageSchema, msg)
    if (response.success) this.handleBrowserResponse(response.output, ws)
  }

  handleClose = (ws: WebSocket) => {
    this.clients.delete(ws)
    this.authenticatedClients.delete(ws)
    if (this.browserWs !== ws) return
    this.browserWs = null
    this.browserRegistered = false
    this.rejectAllPending('Browser disconnected')
    // Intentionally NOT rejecting connectionWaiters here. If a request
    // entered waitForConnection() before the close event (e.g. during a
    // CLOSING→CLOSED transition), the waiter should keep waiting the full
    // APP_WAIT_TIMEOUT for a reconnect. registerBrowser will resolve it
    // via notifyConnectionWaiters if the browser reconnects in time.
    this.notifyConnectionChange()
  }

  handleConnection = (ws: WebSocket) => {
    if (this.bridgeClosed) return
    this.clients.add(ws)
    // Transport security restricts WHO can connect: Unix socket with
    // 0o600 permissions (same-user only) or TCP localhost (any local
    // process). The authenticatedClients set gates WHAT connected clients
    // can do: only those that sent a valid register message may forward
    // requests. The register prompt does NOT include the auth token —
    // the browser app sends the token proactively (from the discovery
    // file or Vite env).
    this.sendRegisterPrompt(ws)
  }

  close = () => {
    this.bridgeClosed = true
    this.rejectAllPending('Server shutting down')
    this.rejectConnectionWaiters('Server shutting down')
    this.browserWs = null
    this.browserRegistered = false
    this.clients.clear()
    this.authenticatedClients.clear()
    this.connectionListeners.clear()
  }
}

export function createBrowserRPCBridge(options: BrowserRPCBridgeOptions) {
  const bridge = new BrowserRPCBridge(options)
  return {
    close: bridge.close,
    isConnected: bridge.isConnected,
    subscribeConnectionChange: bridge.subscribeConnectionChange,
    sendRPC: bridge.sendRPC,
    handleConnection: bridge.handleConnection,
    handleMessage: bridge.handleMessage,
    handleClose: bridge.handleClose
  }
}
