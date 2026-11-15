import type { RPCSender } from '#mcp/tool/registration'

import type { RPCResponse } from './context'

export function splitAutomationTarget(args: Record<string, unknown>): {
  target: { document_id?: string; page_id?: string }
  args: Record<string, unknown>
} {
  const { document_id, page_id, ...rest } = args
  const target: { document_id?: string; page_id?: string } = {}
  if (typeof document_id === 'string') target.document_id = document_id
  if (typeof page_id === 'string') target.page_id = page_id
  return { target, args: rest }
}

export async function sendCommand(
  sendRPC: RPCSender,
  command: string,
  args: Record<string, unknown>
): Promise<RPCResponse> {
  const res = (await sendRPC({ command, args })) as RPCResponse
  if (res.ok === false) throw new Error(res.error)
  return res
}

export function withTarget<T extends object>(body: T, res: RPCResponse): T & { target?: unknown } {
  return res.target ? { ...body, target: res.target } : body
}
