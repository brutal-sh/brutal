import type { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS, registerComponentCatalog, isToolExposed } from '@open-pencil/core/tools'

import {
  checkDesignVersionSelection,
  designVersionForChat,
  designVersionIsOpen,
  designVersionRender
} from '@/app/ai/chat/parallel/scope'
import { clearAgentDraft, showAgentDraft } from '@/app/ai/preview/agent'
import { agentReplyRun } from '@/app/ai/reply/run'
import { runEditorTool, type ReplyCall } from '@/app/ai/tools/runner'
import {
  agentFinished,
  agentPreviewFocus,
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
    const unscopedArgs =
      (args as { scope?: unknown }).scope === 'selection'
        ? limitToSelection(target.store, toolName, requestedArgs)
        : requestedArgs

    // A call from an MCP session shows as that session's agent, working where the call works.
    const session = readAgentSession((args as { agent?: unknown }).agent)
    const toolArgs = designVersionArguments(target, session, toolName, unscopedArgs)
    if (toolName === 'preview_render') {
      return previewTool(target, session, toolArgs, signal)
    }
    const draftRun =
      toolName === 'render' && session?.kind === 'acp'
        ? agentReplyRun(target.store, session.chat)
        : null
    const reply = session ? agentStarted(target.store, session, target.pageId) : 0
    let response: Awaited<ReturnType<typeof runTool>> | undefined
    try {
      response = await runTool(makeFigma, { target, toolName, toolArgs, session, signal })
      return { ok: true, result: response.result }
    } finally {
      if (draftRun) clearAgentDraft(draftRun)
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

function designVersionArguments(
  target: AutomationTarget,
  session: AgentSession | null,
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const version = designVersionForChat(session?.chat)
  if (!version) return args
  if (!agentReplyRun(target.store, session?.chat)) {
    throw new Error('This design version is no longer running.')
  }
  if (toolName === 'preview_render' && version.rootId) {
    throw new Error('This design version already committed.')
  }
  return toolName === 'render' || toolName === 'preview_render'
    ? { jsx: args.jsx, x: version.x, y: version.y }
    : args
}

async function previewTool(
  target: AutomationTarget,
  session: AgentSession | null,
  args: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ ok: true; result: unknown }> {
  const run = session?.kind === 'acp' ? agentReplyRun(target.store, session.chat) : null
  if (!session || !run) {
    throw new Error('A preview requires an active agent chat in this document.')
  }
  const { store, pageId } = target
  if (store.state.readOnly) throw new Error('The document is read-only.')
  const result = await showAgentDraft(
    run,
    target,
    args,
    (focus) => agentPreviewFocus(store, session, pageId, focus),
    signal
  )
  return { ok: true, result }
}

/**
 * An ACP chat's call during its reply belongs to the reply, as the built-in chat's calls do,
 * so the reply can revert it and the transcript marks it under the agent's own call id.
 */
function replyOf(target: AutomationTarget, session: AgentSession | null): ReplyCall | null {
  if (session?.kind !== 'acp') return null
  const run = agentReplyRun(target.store, session.chat)
  const toolCallId =
    session.call ?? (designVersionForChat(session.chat) ? crypto.randomUUID() : null)
  return run && toolCallId ? { run, toolCallId } : null
}

async function runTool(
  makeFigma: FigmaFactory,
  request: ToolRequest
): Promise<{ result: unknown; edited: boolean }> {
  const { target, toolName, toolArgs, session, signal } = request
  const coreTool = ALL_TOOLS.find((t) => t.name === toolName && isToolExposed(t, 'mcp'))
  if (!coreTool) throw new Error(`Unknown tool: ${toolName}`)
  const version = designVersionForChat(session?.chat)
  if (version && toolName === 'select_nodes') checkDesignVersionSelection(version, toolArgs.ids)
  if (version && toolName !== 'render' && toolName !== 'select_nodes' && coreTool.mutates) {
    throw new Error('Use render to commit this design version in its assigned frame.')
  }
  if (version && toolArgs.path !== undefined) {
    throw new Error('Design versions cannot write to a file.')
  }
  const def = version && toolName === 'render' ? designVersionRender(coreTool, version) : coreTool
  const store = target.store
  const libraryService = useLibraryService()
  libraryService.bindEditor(store)
  registerComponentCatalog(store.graph, libraryService)
  const figma = makeFigma(store, target.pageId)
  const selectionIsLive = () => getTabById(target.documentId)?.store === store
  const versionIsLive = version ? () => designVersionIsOpen(version) : undefined
  const result = await runEditorTool({
    store,
    figma,
    def,
    args: toolArgs,
    signal,
    reply: replyOf(target, session),
    isLive: versionIsLive ?? (def.name === 'select_nodes' ? selectionIsLive : undefined)
  })
  if (def.mutates) store.requestRender()
  return { result, edited: def.mutates }
}
