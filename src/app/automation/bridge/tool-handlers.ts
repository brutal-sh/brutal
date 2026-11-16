import type { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS, registerComponentCatalog, isToolExposed } from '@open-pencil/core/tools'
import type { JSONObject } from '@open-pencil/scene-graph/primitives'

import { agentReplyRun } from '@/app/ai/reply/run'
import { runEditorTool, type ReplyCall } from '@/app/ai/tools/runner'
import {
  agentFinished,
  agentStarted,
  readAgentSession,
  touchedNodeIds,
  type AgentSession
} from '@/app/automation/agents'
import { limitToSelection } from '@/app/automation/bridge/selection-scope'
import type { AutomationTarget } from '@/app/automation/bridge/target'
import { useLibraryService } from '@/app/libraries'
import { getTabById } from '@/app/tabs'

type FigmaFactory = (store: AutomationTarget['store'], pageId?: string) => FigmaAPI

interface ToolRequest {
  target: AutomationTarget
  toolName: string
  toolArgs: Record<string, unknown>
  session: AgentSession | null
  signal?: AbortSignal
}

export function createAutomationToolHandler(makeFigma: FigmaFactory) {
  return async function handleTool(
    target: AutomationTarget,
    args: unknown,
    signal?: AbortSignal
  ): Promise<unknown> {
    const toolName = (args as { name?: string }).name
    const requestedArgs = (args as { args?: Record<string, unknown> }).args ?? {}
    if (!toolName) throw new Error('Missing "name" in args')
    // An MCP server that shares only the selection marks its calls, and they stay inside it.
    const toolArgs =
      (args as { scope?: unknown }).scope === 'selection'
        ? limitToSelection(target.store, toolName, requestedArgs)
        : requestedArgs

    // A call from an MCP session shows as that session's agent, working where the call works.
    const session = readAgentSession((args as { agent?: unknown }).agent)
    const reply = session ? agentStarted(target.store, session, target.pageId) : 0
    let response: Awaited<ReturnType<typeof runTool>> | undefined
    try {
      response = await runTool(makeFigma, { target, toolName, toolArgs, session, signal })
      return { ok: true, result: response.result }
    } finally {
      if (session) {
        agentFinished(target.store, session, {
          reply,
          pageId: target.pageId,
          nodeIds: touchedNodeIds(target.store, toolArgs, response?.result),
          edited: response?.edited ?? false
        })
      }
    }
  }
}

/**
 * An ACP chat's call during its reply belongs to the reply, as the built-in chat's calls do,
 * so the reply can revert it and the transcript marks it under the agent's own call id.
 */
function replyOf(target: AutomationTarget, session: AgentSession | null): ReplyCall | null {
  if (session?.kind !== 'acp' || !session.call) return null
  const run = agentReplyRun(target.store, session.chat)
  return run ? { run, toolCallId: session.call } : null
}

async function runTool(
  makeFigma: FigmaFactory,
  request: ToolRequest
): Promise<{ result: unknown; edited: boolean }> {
  const { target, toolName, toolArgs, session, signal } = request
  const def = ALL_TOOLS.find((t) => t.name === toolName && isToolExposed(t, 'mcp'))
  if (!def) throw new Error(`Unknown tool: ${toolName}`)
  const store = target.store
  const libraryService = useLibraryService()
  libraryService.bindEditor(store)
  registerComponentCatalog(store.graph, libraryService)
  const figma = makeFigma(store, target.pageId)
  const result = await runEditorTool({
    store,
    figma,
    def,
    args: toolArgs,
    signal,
    reply: replyOf(target, session),
    isLive:
      def.name === 'select_nodes' ? () => getTabById(target.documentId)?.store === store : undefined
  })
  if (def.mutates) {
    store.requestRender()
    store.flashNodes(extractNodeIds(result))
  }
  return { result, edited: def.mutates }
}

function extractNodeIds(result: unknown): string[] {
  if (!result || typeof result !== 'object') return []
  const obj = result as JSONObject
  if (typeof obj.deleted === 'string') return []
  const ids: string[] = []
  if (typeof obj.id === 'string') ids.push(obj.id)
  if (Array.isArray(obj.results)) {
    for (const item of obj.results) {
      if (item && typeof item === 'object' && typeof (item as JSONObject).id === 'string')
        ids.push((item as JSONObject).id as string)
    }
  }
  return ids
}
