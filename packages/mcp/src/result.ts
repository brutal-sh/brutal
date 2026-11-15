import { Buffer } from 'node:buffer'

export type MCPContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }

export type MCPResult = { content: MCPContent[]; isError?: boolean }

export const MAX_RESULT_BYTES = 900_000

export function resultTooLargeMessage(kind: string, bytes: number, hint: string): string {
  return `${kind} is too large (${Math.round(bytes / 1024)}KB, limit ${Math.round(
    MAX_RESULT_BYTES / 1024
  )}KB). ${hint}`
}

export function ok(data: unknown, toolName?: string): MCPResult {
  return textResult(
    JSON.stringify(data, null, 2),
    toolName,
    'Narrow the request with depth/root_id/node_types, get_node, or find_nodes.'
  )
}

export function okText(text: string, toolName: string): MCPResult {
  return textResult(text, toolName, 'Read one bundled resource at a time.')
}

function textResult(text: string, toolName: string | undefined, hint: string): MCPResult {
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > MAX_RESULT_BYTES) {
    return fail(
      new Error(
        resultTooLargeMessage(toolName ? `Result from "${toolName}"` : 'Result', bytes, hint)
      )
    )
  }
  return { content: [{ type: 'text', text }] }
}

export function fail(e: unknown): MCPResult {
  const msg = e instanceof Error ? e.message : String(e)
  return { content: [{ type: 'text', text: JSON.stringify({ error: msg }) }], isError: true }
}
