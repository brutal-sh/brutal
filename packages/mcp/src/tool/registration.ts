import { resolve } from 'node:path'

import type {
  McpServer,
  ToolCallback,
  ToolAnnotations,
  ServerContext
} from '@modelcontextprotocol/server'
// eslint-disable-next-line open-pencil/no-mixed-case-acronym-identifiers -- Upstream export spelling.
import { toStandardJsonSchema as toStandardJSONSchema } from '@valibot/to-json-schema'
import type * as v from 'valibot'

import { createToolDescriptors } from '#mcp/tool/manifest'
import type { ToolDescriptor, ToolEffect, ToolPolicy } from '#mcp/tool/metadata'
import { isToolEnabled } from '#mcp/tool/policy'

import { registerCoreTools } from './registration/core'
import { registerDocumentTools, registerListDocuments } from './registration/documents'
import { registerFileTools } from './registration/files'
import { registerURISaveTool } from './registration/save'
import { registerCodegenTool, registerSettingsTools } from './registration/settings'

export type RPCSender = (
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal }
) => Promise<unknown>
export type MCPToolSettled = (context: ServerContext) => Promise<void>
export type ToolRegister = <InputArgs extends v.GenericSchema>(
  name: string,
  options: { description?: string; inputSchema: InputArgs },
  handler: ToolCallback<ReturnType<typeof toStandardJSONSchema<InputArgs>>>
) => void

/** Who sends a session's tool calls: any MCP client, or an ACP or Pi harness chat in the app. */
export const MCP_AGENT_KINDS = ['mcp', 'acp', 'harness'] as const
export type MCPAgentKind = (typeof MCP_AGENT_KINDS)[number]

/** The session tool calls come from, so the app can show the client as an agent at work. */
export interface MCPAgentSession {
  id: string
  kind: MCPAgentKind
  /** The app chat the session belongs to, from its `x-openpencil-chat` header. */
  chat?: string
}

export interface RegisterToolsOptions {
  policy: ToolPolicy
  mcpRoot?: string | null
  sendRPC: RPCSender
  agentSession?: MCPAgentSession
  /** Transport lifecycle cleanup after tool execution, including cancellation. */
  onToolSettled?: MCPToolSettled
}

function toolAnnotations(effect: ToolEffect): ToolAnnotations {
  return {
    readOnlyHint: effect === 'read',
    destructiveHint: effect === 'write'
  }
}

function descriptorByName(descriptors: readonly ToolDescriptor[]): Map<string, ToolDescriptor> {
  return new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]))
}

/**
 * The id the agent gave a call in its own conversation, which an app chat shows it under: Codex
 * sends it as `callId`, Claude Code as `claudecode/toolUseId`.
 */
function agentCallId(meta: Record<string, unknown> | undefined): string | undefined {
  const id = meta?.callId ?? meta?.['claudecode/toolUseId']
  return typeof id === 'string' && id.length > 0 && id.length <= 128 ? id : undefined
}

export function registerTools(mcpServer: McpServer, options: RegisterToolsOptions): void {
  const { policy, sendRPC, agentSession } = options
  // Sent with each tool call: the session, the client's name once it has introduced itself,
  // and for an app chat's agent, the chat and the call's id in it.
  const agent = (meta: Record<string, unknown> | undefined) => {
    if (!agentSession) return undefined
    const session = {
      session: agentSession.id,
      kind: agentSession.kind,
      client: mcpServer.server.getClientVersion()?.name
    }
    if (!agentSession.chat) return session
    return { ...session, chat: agentSession.chat, call: agentCallId(meta) }
  }
  const resolvedRoot = options.mcpRoot ? resolve(options.mcpRoot) : null
  const descriptors = descriptorByName(createToolDescriptors(resolvedRoot !== null))
  const register: ToolRegister = (name, toolOptions, handler) => {
    const descriptor = descriptors.get(name)
    if (!descriptor) throw new Error(`Missing MCP tool descriptor for "${name}"`)
    if (!isToolEnabled(descriptor, policy)) return
    mcpServer.registerTool(
      name,
      {
        description: toolOptions.description ?? descriptor.description,
        inputSchema: toStandardJSONSchema(toolOptions.inputSchema),
        annotations: toolAnnotations(descriptor.effect),
        _meta: { 'openpencil/capabilities': descriptor.capabilities }
      },
      async (args, context) => {
        try {
          return await handler(args, context)
        } finally {
          await options.onToolSettled?.(context)
        }
      }
    )
  }

  // The app can pin all commands from a parallel coding-agent session to its assigned version.
  const chat = agentSession?.kind === 'acp' ? agentSession.chat : undefined
  const scopedSender: RPCSender = (body, options) => {
    const args = body.args
    return sendRPC(
      { ...body, args: { ...(args && typeof args === 'object' ? args : {}), app_chat: chat } },
      options
    )
  }
  const context = { register, sendRPC: chat ? scopedSender : sendRPC, policy, resolvedRoot, agent }
  registerCoreTools(context, agentSession?.kind === 'acp' && !!agentSession.chat)
  registerListDocuments(context)
  registerFileTools(context)
  registerURISaveTool(context)
  registerDocumentTools(context)
  registerSettingsTools(context)
  registerCodegenTool(context)
}
