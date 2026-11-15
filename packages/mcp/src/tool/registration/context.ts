import type { ToolPolicy } from '#mcp/tool/metadata'
import type { RPCSender, ToolRegister } from '#mcp/tool/registration'

export interface RegistrationContext {
  register: ToolRegister
  sendRPC: RPCSender
  policy: ToolPolicy
  resolvedRoot: string | null
  agent: (meta: Record<string, unknown> | undefined) => Record<string, unknown> | undefined
}

export type RPCResponse = { ok?: boolean; result?: unknown; target?: unknown; error?: string }
