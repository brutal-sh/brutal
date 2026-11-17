import * as v from 'valibot'

import type { ACPAgentDef } from '@open-pencil/core/constants'

export class CodexModelSelectionError extends Error {
  override name = 'CodexModelSelectionError'
}

function isMissingCommandError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('enoent') || normalized.includes('program not found')
}

function missingCommandMessage(agentDef?: ACPAgentDef): string {
  if (!agentDef) return 'ACP agent CLI is not installed.'
  if (!agentDef.installCommand) {
    return `"${agentDef.command}" is not installed. Install it and restart Open Pen.`
  }
  return `"${agentDef.command}" is not installed. Install it with: ${agentDef.installCommand}`
}

const connectionErrorSchema = v.object({
  message: v.string(),
  data: v.optional(v.unknown())
})
const connectionErrorDetailsSchema = v.object({ details: v.string() })

export function formatConnectionError(e: unknown, agentDef?: ACPAgentDef): string {
  if (isAuthRequiredError(e)) {
    return `${agentDef?.name ?? 'The agent'} is not signed in. Sign in from Set up AI, then try again.`
  }
  const error = v.safeParse(connectionErrorSchema, e)
  const details = error.success
    ? v.safeParse(connectionErrorDetailsSchema, error.output.data)
    : null
  let msg = error.success ? error.output.message : String(e)
  if (details?.success && details.output.details) msg += `: ${details.output.details}`
  if (
    msg.includes('ECONNREFUSED') ||
    msg.includes('fetch failed') ||
    msg.includes('Failed to fetch')
  ) {
    return 'MCP server is not running. Make sure the editor is open.'
  }
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('ETIMEDOUT')) {
    return 'MCP server did not respond in time.'
  }
  if (isMissingCommandError(msg)) {
    return missingCommandMessage(agentDef)
  }
  return msg
}

/** ACP's `auth_required` error, which an agent returns for a new session before sign-in. */
function isAuthRequiredError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e && e.code === -32000
}
