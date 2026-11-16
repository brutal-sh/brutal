import type * as v from 'valibot'
import type { WebSocket } from 'ws'

import type { requestMessageSchema, responseMessageSchema } from '#mcp/browser-rpc/schema'
import type { RPCJSONObject } from '#mcp/json'

type BrowserMessage =
  | v.InferOutput<typeof requestMessageSchema>
  | v.InferOutput<typeof responseMessageSchema>

export function stripEnvelope(msg: BrowserMessage): Record<string, unknown> {
  const { type: _type, id: _id, ...body } = msg
  return body
}

export function responsePayload(result: unknown): RPCJSONObject {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result as RPCJSONObject
  }
  return { result }
}

export function sendJSON(ws: WebSocket, body: Record<string, unknown>) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(body))
}
