import * as v from 'valibot'

import { endAgentSession, readAgentSession } from '@/app/automation/agents'
import { isUnknownRecord } from '@/app/automation/bridge/target'

const messageSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.variant('type', [
    v.object({
      type: v.literal('request'),
      id: v.pipe(v.string(), v.nonEmpty()),
      command: v.string(),
      args: v.optional(v.unknown())
    }),
    v.object({ type: v.literal('cancel'), id: v.pipe(v.string(), v.nonEmpty()) })
  ])
)

type RunRequest = (command: string, args: unknown, signal: AbortSignal) => Promise<unknown>

// A reconnect's old socket must not end an agent still carried by its new connection.
const sessionSockets = new Map<string, Set<WebSocket>>()

function trackSession(socket: WebSocket, args: unknown) {
  const session = isUnknownRecord(args) ? readAgentSession(args.agent) : null
  if (!session) return
  const sockets = sessionSockets.get(session.session) ?? new Set<WebSocket>()
  sockets.add(socket)
  sessionSockets.set(session.session, sockets)
}

function endSocketSessions(socket: WebSocket) {
  for (const [id, sockets] of sessionSockets) {
    if (!sockets.delete(socket) || sockets.size > 0) continue
    sessionSockets.delete(id)
    endAgentSession(id)
  }
}

function readMessage(data: unknown) {
  const parsed = v.safeParse(messageSchema, data)
  if (parsed.success) return parsed.output
  if (parsed.issues.some((issue) => issue.type === 'parse_json'))
    console.warn('Failed to parse WebSocket message:', v.summarize(parsed.issues))
  return null
}

function abortRequests(pending: Map<string, AbortController>) {
  for (const controller of pending.values()) controller.abort()
  pending.clear()
}

/** Cancellation IDs are meaningful only on the socket that dispatched the request. */
export function createAutomationMessages(socket: WebSocket, run: RunRequest) {
  const pending = new Map<string, AbortController>()
  let closed = false
  const respond = (id: string, body: object) => {
    if (socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ type: 'response', id, ...body }))
  }
  const receive = async (event: MessageEvent) => {
    try {
      if (closed) return
      const msg = readMessage(event.data)
      if (!msg) return
      if (msg.type === 'cancel') {
        pending.get(msg.id)?.abort()
        return
      }
      if (pending.has(msg.id)) return
      const controller = new AbortController()
      pending.set(msg.id, controller)
      trackSession(socket, msg.args)
      try {
        const result = await run(msg.command, msg.args, controller.signal)
        respond(msg.id, result as object)
      } catch (error) {
        respond(msg.id, {
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      } finally {
        pending.delete(msg.id)
      }
    } catch (error) {
      console.warn('Failed to parse WebSocket message:', error)
    }
  }
  const abort = () => {
    closed = true
    abortRequests(pending)
  }
  return {
    receive,
    abort,
    close: () => {
      abort()
      endSocketSessions(socket)
    }
  }
}
