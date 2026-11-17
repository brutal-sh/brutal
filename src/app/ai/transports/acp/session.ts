import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import type { Client, SessionNotification } from '@agentclientprotocol/sdk'
import * as v from 'valibot'

import type { ACPAgentDef, ACPAgentID } from '@open-pencil/core/constants'

import { parseAuthStatusUpdate } from '@/app/ai/agents/acp/auth/status'
import { setAgentCommands } from '@/app/ai/agents/acp/commands'
import { CodexModelSelectionError, selectACPChatModel } from '@/app/ai/agents/acp/model'
import { spawnACPProcess, type TauriChild } from '@/app/ai/agents/acp/process'
import { linkOwnTools, type OwnToolsLink } from '@/app/ai/agents/acp/tools'
import { describeDiagnosticError, recordACPTransportFailure } from '@/app/diagnostics'

import { formatConnectionError } from './errors'

export interface ACPSession {
  connection: ClientSideConnection
  sessionId: string
  /** The id the agent’s tool calls carry, which ties them to this chat’s replies. */
  chat: string
  child: TauriChild
  onUpdate: ((params: SessionNotification) => void) | null
  dead: boolean
  /** Codex names the model when it starts, while Claude names it in usage updates. */
  model: string | null
}

interface ACPChatStartup {
  agentDef: ACPAgentDef
  cwd: string
  destroying: () => boolean
  onUnexpectedClose: (session: ACPSession) => void
  onStarting: (child: TauriChild) => void
  onStartFailed: (child: TauriChild) => void
}

interface SessionEvents {
  onUpdate: ACPSession['onUpdate']
  session: ACPSession | null
}

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
  if (error instanceof ACPToolsUnreachableError || error instanceof CodexModelSelectionError) {
    return error
  }
  return new Error(formatConnectionError(error, agent))
}

function untilAgentStops(connection: ClientSideConnection) {
  // The SDK leaves requests pending when the agent exits, so startup requests race it.
  const stopped = connection.closed.then((): never => {
    throw new Error('The agent stopped while it was starting.')
  })
  stopped.catch(() => undefined)
  return <T>(request: Promise<T>): Promise<T> => Promise.race([request, stopped])
}

async function createToolSession(options: {
  connection: ClientSideConnection
  cwd: string
  agentName: string
  events: SessionEvents
  wait: ReturnType<typeof untilAgentStops>
}) {
  const { connection, cwd, agentName, events, wait } = options
  const { getAutomationAuthToken } = await import('@/app/automation/mcp/spawn')
  const token = await getAutomationAuthToken()
  await wait(connection.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {} }))
  const tools: OwnToolsLink = await linkOwnTools(token)
  events.onUpdate = ({ update }) => tools.noteUpdate(update)
  try {
    const result = await wait(
      connection.newSession({ cwd, mcpServers: tools.mcpServers, _meta: tools.meta })
    )
    const outcome = await wait(tools.outcome())
    if (outcome.connected === false) {
      throw new ACPToolsUnreachableError(
        `${agentName} couldn't reach Open Pen's tools, so your message wasn't sent.` +
          (outcome.reason ? ` ${agentName} reported: ${outcome.reason}` : '')
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
  const { agentDef, cwd, destroying, onStarting, onStartFailed } = options
  const events: SessionEvents = { onUpdate: null, session: null }
  const { child, input, output } = await spawnChatProcess(options, events)
  onStarting(child)
  try {
    const connection = new ClientSideConnection(
      () => createClient(agentDef.id, events),
      ndJsonStream(input, output)
    )
    const wait = untilAgentStops(connection)
    const { result, chat } = await createToolSession({
      connection,
      cwd,
      agentName: agentDef.name,
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
