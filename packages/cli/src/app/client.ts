import { request as httpRequest } from 'node:http'
import type { IncomingMessage } from 'node:http'

import { isEqual } from 'es-toolkit'
import * as v from 'valibot'

import { readDiscoveryFile } from '@open-pencil/mcp/discovery'
import type { DiscoveryInfo } from '@open-pencil/mcp/discovery'
import { platformHasUnixSockets } from '@open-pencil/mcp/transport'

import type { AppTarget } from '#cli/app/target'

import { appErrorSchema, appResponseSchema } from './schema'

/** Maximum time to wait for a single RPC request before giving up. */
const RPC_TIMEOUT_MS = 30_000

let cachedInfo: DiscoveryInfo | null = null

async function resolveDiscovery(): Promise<DiscoveryInfo> {
  if (cachedInfo) return cachedInfo

  cachedInfo = await currentDiscovery()
  return cachedInfo
}

async function currentDiscovery(): Promise<DiscoveryInfo> {
  const info = await readDiscoveryFile()
  if (!info) {
    throw new Error(
      'Could not read MCP discovery file.\n' +
        'Is the app running? Start it with: bun run tauri dev'
    )
  }

  return info
}

function doRequest(
  info: DiscoveryInfo,
  body: Record<string, unknown>,
  forceTcp = false
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const bodyJSON = JSON.stringify(body)
    const headers: Record<string, string> = {}
    if (bodyJSON) headers['Content-Type'] = 'application/json'
    if (info.authToken) headers.Authorization = `Bearer ${info.authToken}`

    // Use the narrowed `useSocket` variable (string | false) to construct
    // request options so TypeScript knows socketPath is a string when truthy.
    const useSocket = !forceTcp && platformHasUnixSockets() && info.socketPath
    const path = '/rpc'
    const method = 'POST'
    const reqOpts = useSocket
      ? { socketPath: useSocket, path, method, headers }
      : { hostname: '127.0.0.1', port: info.httpPort, path, method, headers }

    const req = httpRequest(reqOpts, (res: IncomingMessage) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        clearTimeout(timer)
        const raw = Buffer.concat(chunks).toString('utf-8')
        let data: unknown
        try {
          data = v.parse(v.pipe(v.string(), v.parseJson(), v.unknown()), raw)
        } catch {
          data = raw
        }
        resolve({ status: res.statusCode ?? 500, data })
      })
      res.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    const timer = setTimeout(() => {
      req.destroy(new Error(`RPC request timed out after ${RPC_TIMEOUT_MS / 1000}s`))
    }, RPC_TIMEOUT_MS)

    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    if (bodyJSON) req.write(bodyJSON)
    req.end()
  })
}

/** A successful app response: the command result plus the document it ran against, if any. */
export interface RPCResponse<T> {
  result: T
  target?: AppTarget
}

async function doRPC<T>(
  info: DiscoveryInfo,
  command: string,
  args: unknown,
  forceTcp = false
): Promise<RPCResponse<T>> {
  const { status, data } = await doRequest(info, { command, args }, forceTcp)

  if (status === 401) {
    throw new UnauthorizedError(
      'Unauthorized: the auth token in the MCP discovery file may be stale'
    )
  }
  if (status >= 400) {
    const parsed = v.safeParse(appErrorSchema, data)
    throw new AppCommandError(
      (parsed.success ? parsed.output.error : undefined) ?? `RPC failed: HTTP ${status}`
    )
  }

  const parsed = v.safeParse(appResponseSchema, data)
  if (!parsed.success)
    throw new AppCommandError('Invalid app response. Check command state before retrying.')
  const body = parsed.output
  if (!body.ok) throw new AppCommandError(body.error ?? 'RPC failed')
  return { result: body.result as T, ...(body.target ? { target: body.target } : {}) }
}

/** Error class to distinguish auth failures for retry logic. */
class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** The app received the request; repeating it could repeat an edit. */
class AppCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppCommandError'
  }
}

function isSocketConnectionError(error: unknown): boolean {
  if (!(error instanceof Error) || error instanceof AppCommandError) return false
  const code = 'code' in error ? String(error.code) : ''
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOENT' ||
    code === 'FailedToOpenSocket' ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ENOENT')
  )
}

async function rpcWithFallback<T>(
  info: DiscoveryInfo,
  command: string,
  args: unknown
): Promise<RPCResponse<T>> {
  try {
    return await doRPC<T>(info, command, args)
  } catch (error) {
    if (
      !platformHasUnixSockets() ||
      !info.socketPath ||
      info.httpPort <= 0 ||
      !isSocketConnectionError(error)
    ) {
      throw error
    }
    return doRPC<T>(info, command, args, true)
  }
}

export async function rpc<T = unknown>(command: string, args: unknown = {}): Promise<T> {
  return (await rpcResponse<T>(command, args)).result
}

/** Like `rpc`, but keeps the target document the app resolved for the command. */
export async function rpcResponse<T = unknown>(
  command: string,
  args: unknown = {}
): Promise<RPCResponse<T>> {
  try {
    return await rpcWithFallback<T>(await resolveDiscovery(), command, args)
  } catch (error) {
    if (!(error instanceof UnauthorizedError) && !isSocketConnectionError(error)) throw error
    cachedInfo = null
    return rpcWithFallback<T>(await resolveDiscovery(), command, args)
  }
}

/** A session never follows a replacement app or retries a received command. */
export async function createAppConnection() {
  const info = await currentDiscovery()
  return async (command: string, args: unknown = {}): Promise<RPCResponse<unknown>> => {
    if (!isEqual(info, await currentDiscovery()))
      throw new Error('The app connection changed. Start a new interactive session.')
    return rpcWithFallback(info, command, args)
  }
}

export function isAppMode(file?: string): boolean {
  return !file
}

export function requireFile(file?: string): string {
  if (!file) throw new Error('File path is required for headless mode')
  return file
}
