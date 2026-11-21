import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import type { Client, SessionNotification } from '@agentclientprotocol/sdk'
import * as v from 'valibot'

import type { ACPAgentDef, ACPAgentID } from '@open-pencil/core/constants'

import { parseAuthStatusUpdate } from '@/app/ai/agents/acp/auth/status'
import { setAgentCommands } from '@/app/ai/agents/acp/commands'
import { CodexModelSelectionError, formatConnectionError } from '@/app/ai/agents/acp/errors'
import { selectACPChatModel } from '@/app/ai/agents/acp/model'
import { spawnACPProcess, type TauriChild } from '@/app/ai/agents/acp/process'
import { AgentSessionResumeError, openAgentSession } from '@/app/ai/agents/acp/session'
import { linkOwnTools, type OwnToolsLink } from '@/app/ai/agents/acp/tools'
import { describeDiagnosticError, recordACPTransportFailure } from '@/app/diagnostics'
import { createDeferred } from '@/app/runtime/deferred'

export interface ACPSession {
  connection: ClientSideConnection
  sessionId: string
  /** The id the agent’s tool calls carry, which ties them to this chat’s replies. */
  chat: string
  child: TauriChild
  onUpdate: ((params: SessionNotification) => void) | null
  dead: boolean
  resumed: boolean
  /** Codex names the model when it starts, while Claude names it in usage updates. */
  model: string | null
}

interface ACPChatStartup {
  agentDef: ACPAgentDef
  cwd: string
  resume: string | null
  signal?: AbortSignal
  destroying: () => boolean
  onUnexpectedClose: (session: ACPSession) => void
  onStarting: (child: TauriChild) => void
  onStartFailed: (child: TauriChild) => void
}

interface SessionEvents {
  onUpdate: ACPSession['onUpdate']
  session: ACPSession | null
}

const SESSION_START_TIMEOUT_MS = 60_000
const usageMetaSchema = v.object({ '_claude/model': v.string() })

function createClient(agent: ACPAgentID, events: SessionEvents): Client {
  return {
    async requestPermission(params) {
      const { requestPermissionFromUser } = await import('@/app/ai/agents/acp/permission')
      return requestPermissionFromUser(params)
    },
    async sessionUpdate(params) {
      const { update } = params
      if (update.sessionUpdate === 'usage_update' && events.session) {
        const meta = v.safeParse(usageMetaSchema, update._meta)
        if (meta.success) events.session.model = meta.output['_claude/model']
      }
      if (update.sessionUpdate === 'available_commands_update') {
        setAgentCommands(agent, update.availableCommands)
      }
      events.onUpdate?.(params)
    },
    async extNotification(method, params) {
      const status = parseAuthStatusUpdate(method, params)
      if (!status) return
      const { agentAccounts } = await import('@/app/ai/agents/setup/accounts')
      agentAccounts.report(agent, status)
    }
  }
}

class ACPToolsUnreachableError extends Error {
  override name = 'ACPToolsUnreachableError'
}

function startupError(error: unknown, agent: ACPAgentDef): Error {
  recordACPTransportFailure({ operation: 'start', ...describeDiagnosticError(error) })
  if (
    error instanceof ACPToolsUnreachableError ||
    error instanceof CodexModelSelectionError ||
    error instanceof AgentSessionResumeError
  ) {
    return error
  }
  return new Error(formatConnectionError(error, agent))
}

function startupWait(connection: ClientSideConnection, signal?: AbortSignal) {
  // The SDK leaves pending requests unanswered when the agent exits.
  const stopped = connection.closed.then((): never => {
    throw new Error('The agent stopped while it was starting.')
  })
  stopped.catch(() => undefined)
  return async <T>(request: Promise<T>): Promise<T> => {
    const cancelled = createDeferred<never>()
    const abort = () => cancelled.reject(signal?.reason)
    const timer = setTimeout(
      () => cancelled.reject(new Error('The agent did not answer while starting.')),
      SESSION_START_TIMEOUT_MS
    )
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    try {
      return await Promise.race([request, stopped, cancelled.promise])
    } finally {
      signal?.removeEventListener('abort', abort)
      clearTimeout(timer)
    }
  }
}

async function createToolSession(options: {
  connection: ClientSideConnection
  cwd: string
  agentDef: ACPAgentDef
  resume: string | null
  events: SessionEvents
  wait: ReturnType<typeof startupWait>
}) {
  const { connection, cwd, agentDef, resume, events, wait } = options
  const { getAgentMCPAuthToken } = await import('@/app/automation/mcp/runtime')
  const token = await wait(getAgentMCPAuthToken())
  const initialized = await wait(
    connection.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} })
  )
  const linking = linkOwnTools(token)
  const tools: OwnToolsLink = await wait(linking).catch((error: unknown) => {
    void linking.then((late) => late.stop()).catch(() => undefined)
    throw error
  })
  events.onUpdate = ({ update }) => tools.noteUpdate(update)
  try {
    const result = await wait(
      openAgentSession(
        connection,
        agentDef,
        initialized,
        { cwd, mcpServers: tools.mcpServers, _meta: tools.meta },
        resume
      )
    )
    const outcome = await wait(tools.outcome())
    if (outcome.connected === false) {
      throw new ACPToolsUnreachableError(
        `${agentDef.name} couldn't reach Brutal's tools, so your message wasn't sent.` +
          (outcome.reason ? ` ${agentDef.name} reported: ${outcome.reason}` : '')
      )
    }
    return { result, chat: tools.chat }
  } catch (error) {
    tools.stop()
    throw error
  } finally {
    events.onUpdate = null
  }
}

function spawnChatProcess(options: ACPChatStartup, events: SessionEvents) {
  const { agentDef, destroying, onUnexpectedClose } = options
  return spawnACPProcess({
    command: agentDef.command,
    args: agentDef.args,
    logId: agentDef.id,
    destroying,
    onUnexpectedClose: () => {
      if (!events.session) return
      events.session.dead = true
      onUnexpectedClose(events.session)
    }
  }).catch((error: unknown) => {
    throw startupError(error, agentDef)
  })
}

export async function openACPChatSession(options: ACPChatStartup): Promise<ACPSession> {
  const { agentDef, cwd, resume, signal, destroying, onStarting, onStartFailed } = options
  const events: SessionEvents = { onUpdate: null, session: null }
  signal?.throwIfAborted()
  const { child, input, output } = await spawnChatProcess(options, events)
  onStarting(child)
  try {
    signal?.throwIfAborted()
    const connection = new ClientSideConnection(
      () => createClient(agentDef.id, events),
      ndJsonStream(input, output)
    )
    const wait = startupWait(connection, signal)
    const { result, chat } = await createToolSession({
      connection,
      cwd,
      agentDef,
      resume,
      events,
      wait
    })
    if (destroying()) throw new Error('The chat closed while its agent was starting.')
    const model = await selectACPChatModel(agentDef.id, result, (request) =>
      wait(connection.setSessionConfigOption(request))
    )
    events.session = {
      connection,
      sessionId: result.sessionId,
      chat,
      child,
      model,
      dead: false,
      resumed: resume !== null,
      get onUpdate() {
        return events.onUpdate
      },
      set onUpdate(fn) {
        events.onUpdate = fn
      }
    }
    return events.session
  } catch (error) {
    onStartFailed(child)
    await child.kill().catch(() => undefined)
    throw startupError(error, agentDef)
  }
}
