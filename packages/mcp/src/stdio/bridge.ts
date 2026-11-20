import { rpcHTTPError, sendHTTP } from '#mcp/stdio/http'
import { readDiscoveryFile } from '#mcp/transport/discovery'
import { getSocketPath, platformHasUnixSockets } from '#mcp/transport/paths'

type StdioRPCBridgeOptions = {
  /** Override socket path (if known). Auto-discovered if omitted. */
  socketPath?: string | null
  /** Auth token for /rpc Bearer header. */
  authToken?: string | null
  reconnectDelayMs?: number
  onReady?: () => void
  onReconnect?: () => void
}

// 35s gives a 5s margin over the worst case (10s app wait + 20s RPC timeout = 30s)
const RPC_TIMEOUT = 35_000
const DISCONNECTED_MESSAGE =
  'Brutal app is not connected. ' +
  'STOP and tell the user: "The Brutal desktop app is not running or no document is open. ' +
  'Please start the app and open a document, then try again." ' +
  'Do NOT attempt to start the app yourself or retry automatically.'

type TransportMode = 'socket' | 'tcp'

/**
 * Creates an RPC bridge that connects to the MCP server via HTTP
 * over a Unix domain socket.
 *
 * This replaces the previous WebSocket-based bridge with a simpler
 * HTTP approach that natively supports Unix domain sockets.
 */
class StdioRPCBridge {
  constructor(private readonly options: StdioRPCBridgeOptions) {
    this.resolvedSocketPath = options.socketPath ?? null
    this.hasExplicitSocketPath = options.socketPath !== undefined && options.socketPath !== null
    this.hasExplicitAuth = options.authToken !== undefined
    this.resolvedAuthToken = options.authToken ?? null
    this.connectPromise = this.connect()
  }
  private resolvedSocketPath: string | null
  private resolvedHttpPort: number | null = null
  private transportMode: TransportMode | null = null
  private ready = false
  private wasConnected = false
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private connectPromise: Promise<void> | null = null
  private closed = false
  private authFailure = false
  private socketFailed = false

  // Socket path resolution has two tiers:
  //   Explicit: socketPathOverride parameter — authoritative pin, never
  //             overwritten by discovery during reconnect.
  //   Hint:     OPENPENCIL_MCP_SOCKET env var — resolved through
  //             getSocketPath() and readDiscoveryFile(); NOT treated as
  //             explicit, so the bridge can pick up a changed path from the
  //             discovery file after a server restart.
  private readonly hasExplicitSocketPath: boolean
  // Track whether authToken was explicitly provided by the caller.
  // When false, the token is auto-discovered from the discovery file and
  // can be refreshed transparently on 401 without surfacing the error.
  private readonly hasExplicitAuth: boolean
  private resolvedAuthToken: string | null

  private resolveAuthToken = async (): Promise<string | null> => {
    if (this.hasExplicitAuth) return this.resolvedAuthToken
    if (this.resolvedAuthToken) return this.resolvedAuthToken
    const info = await readDiscoveryFile()
    if (info?.authToken) {
      this.resolvedAuthToken = info.authToken
    }
    return this.resolvedAuthToken
  }

  private useTCP = (port: number | undefined) => {
    if (!port) throw new Error('No MCP server discovery info found')
    this.resolvedHttpPort = port
    this.transportMode = 'tcp'
  }

  private resolveSocket = async (info: Awaited<ReturnType<typeof readDiscoveryFile>>) => {
    if (this.hasExplicitSocketPath && this.resolvedSocketPath) {
      // An explicit socket path is authoritative across discovery changes.
    } else if (info?.socketPath) this.resolvedSocketPath = info.socketPath
    else if (info?.httpPort) {
      this.useTCP(info.httpPort)
      return
    } else this.resolvedSocketPath = await getSocketPath()
    if (info?.httpPort) this.resolvedHttpPort = info.httpPort
    this.transportMode = this.socketFallback()
  }

  private socketFallback = (): TransportMode =>
    !this.hasExplicitSocketPath && this.socketFailed && this.resolvedHttpPort ? 'tcp' : 'socket'

  private resolveTransport = async (): Promise<void> => {
    if (this.transportMode) return
    const info = await readDiscoveryFile()
    if (!this.hasExplicitAuth && info?.authToken) this.resolvedAuthToken = info.authToken
    if (!platformHasUnixSockets()) this.useTCP(info?.httpPort)
    else await this.resolveSocket(info)
  }

  /**
   * Makes an HTTP request to the MCP server via socket or TCP.
   */
  private httpRequest = (
    method: string,
    path: string,
    body?: Record<string, unknown>,
    signal?: AbortSignal
  ) => {
    const headers: Record<string, string> = {}
    if (body) headers['Content-Type'] = 'application/json'
    if (this.resolvedAuthToken) headers.Authorization = `Bearer ${this.resolvedAuthToken}`
    const endpoint = this.endpoint()
    if (!endpoint) return Promise.reject(new Error(DISCONNECTED_MESSAGE))
    return sendHTTP({ ...endpoint, path, method, headers, signal }, body)
  }

  private endpoint = () => {
    if (this.transportMode === 'socket' && this.resolvedSocketPath)
      return { socketPath: this.resolvedSocketPath }
    if (this.transportMode === 'tcp' && this.resolvedHttpPort)
      return { hostname: '127.0.0.1', port: this.resolvedHttpPort }
    return null
  }

  /**
   * Checks if the server is healthy and the browser is connected.
   */
  private checkHealth = async (): Promise<{
    reachable: boolean
    appConnected: boolean
    authFailed: boolean
  }> => {
    try {
      const { status, data } = await this.httpRequest('GET', '/health')
      if (status === 401) return { reachable: true, appConnected: false, authFailed: true }
      if (status !== 200) return { reachable: false, appConnected: false, authFailed: false }
      const health = data as { status?: string }
      return {
        reachable: health.status === 'ok' || health.status === 'no_app',
        appConnected: health.status === 'ok',
        authFailed: false
      }
    } catch {
      if (!this.hasExplicitSocketPath && this.transportMode === 'socket') this.socketFailed = true
      return { reachable: false, appConnected: false, authFailed: false }
    }
  }

  /**
   * Attempts to connect to the server. Retries with a fixed delay.
   */
  private connect = async (): Promise<void> => {
    if (this.closed) return
    try {
      await this.resolveTransport()
      if (!this.resolvedAuthToken) await this.resolveAuthToken()
    } catch {
      this.connectPromise = null
      this.scheduleReconnect()
      return
    }

    // close() may have been called while we were resolving transport.
    // oxlint-disable-next-line no-unnecessary-condition
    if (this.closed) return

    const { reachable, appConnected, authFailed } = await this.checkHealth()
    // oxlint-disable-next-line no-unnecessary-condition
    if (this.closed) return
    this.acceptHealth({ reachable, appConnected, authFailed })
  }

  private acceptHealth = ({
    reachable,
    appConnected,
    authFailed
  }: Awaited<ReturnType<StdioRPCBridge['checkHealth']>>) => {
    this.connectPromise = null
    if (authFailed) {
      this.authFailure = true
      this.ready = false
      if (!this.hasExplicitAuth) {
        this.resolvedAuthToken = null
        this.transportMode = null
      }
      this.scheduleReconnect()
      return
    }
    this.authFailure = false
    if (appConnected || reachable) {
      this.ready = true
      this.socketFailed = false
      if (!this.wasConnected) {
        this.wasConnected = true
        this.options.onReady?.()
      } else if (appConnected) this.options.onReconnect?.()
      return
    }
    this.resetTransport()
  }

  private scheduleReconnect = () => {
    if (this.closed) return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.connectPromise = this.connect()
    }, this.options.reconnectDelayMs ?? 2000)
    this.reconnectTimer.unref()
  }

  private resetTransport = () => {
    this.transportMode = null
    if (!this.hasExplicitSocketPath) this.resolvedSocketPath = null
    this.resolvedHttpPort = null
    this.ready = false
    this.scheduleReconnect()
  }

  private attempt = async (
    body: Record<string, unknown>,
    allowAuthRetry: boolean,
    signal: AbortSignal
  ): Promise<unknown> => {
    signal.throwIfAborted()
    let response: Awaited<ReturnType<StdioRPCBridge['httpRequest']>>
    try {
      response = await this.httpRequest('POST', '/rpc', body, signal)
    } catch {
      signal.throwIfAborted()
      if (!this.hasExplicitSocketPath && this.transportMode === 'socket') this.socketFailed = true
      this.resetTransport()
      throw new Error(DISCONNECTED_MESSAGE)
    }
    signal.throwIfAborted()
    const { status, data } = response
    if (status === 401) {
      if (allowAuthRetry && !this.hasExplicitAuth) return this.retryAuth(body, signal)
      this.authFailure = true
      if (!this.hasExplicitAuth) this.resolvedAuthToken = null
      this.resetTransport()
      throw new Error('Unauthorized: check OPENPENCIL_MCP_AUTH_TOKEN')
    }
    if (status >= 400) throw rpcHTTPError(status, data)
    return data
  }

  private retryAuth = async (
    body: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<unknown> => {
    this.resolvedAuthToken = null
    let info: Awaited<ReturnType<typeof readDiscoveryFile>>
    try {
      info = await readDiscoveryFile()
    } catch {
      signal.throwIfAborted()
      this.resetTransport()
      throw new Error(DISCONNECTED_MESSAGE)
    }
    signal.throwIfAborted()
    if (info?.authToken) {
      this.resolvedAuthToken = info.authToken
      return this.attempt(body, false, signal)
    }
    this.authFailure = true
    this.resetTransport()
    throw new Error('Unauthorized')
  }

  sendRPC = async (
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ): Promise<unknown> => {
    const signal = options?.signal
    signal?.throwIfAborted()
    if (!this.ready && this.connectPromise) await this.connectPromise
    signal?.throwIfAborted()
    if (this.authFailure) throw new Error('Unauthorized: check OPENPENCIL_MCP_AUTH_TOKEN')
    if (!this.ready) throw new Error(DISCONNECTED_MESSAGE)
    const controller = new AbortController()
    const abort = () => controller.abort(signal?.reason)
    const timer = setTimeout(
      () => controller.abort(new Error(`RPC timeout (${Math.round(RPC_TIMEOUT / 1000)}s)`)),
      RPC_TIMEOUT
    )
    signal?.addEventListener('abort', abort, { once: true })
    try {
      return await this.attempt(body, true, controller.signal)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }

  close = (): void => {
    this.closed = true
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = undefined
    this.ready = false
    this.connectPromise = null
  }
}

export function createStdioRPCBridge(options: StdioRPCBridgeOptions) {
  const bridge = new StdioRPCBridge(options)
  return { sendRPC: bridge.sendRPC, close: bridge.close }
}
