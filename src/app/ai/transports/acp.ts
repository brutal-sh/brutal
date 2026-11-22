import type { SessionUpdate, Usage } from '@agentclientprotocol/sdk'
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'

import type { ACPAgentDef } from '@open-pencil/core/constants'

import { formatConnectionError } from '@/app/ai/agents/acp/errors'
import { createUpdateMapper } from '@/app/ai/agents/acp/events'
import type { TauriChild } from '@/app/ai/agents/acp/process'
import { AgentSessionResumeError } from '@/app/ai/agents/acp/session'
import {
  releaseDesignVersion,
  VERSION_HEIGHT,
  VERSION_WIDTH,
  type DesignVersionTarget
} from '@/app/ai/chat/parallel/scope'
import SYSTEM_PROMPT from '@/app/ai/chat/system-prompt'
import { endRun, forgetAgentChat, startAgentRun } from '@/app/ai/reply/run'
import { restAgents, setAgentChatModel } from '@/app/automation/agents'
import { describeDiagnosticError, recordACPTransportFailure } from '@/app/diagnostics'
import type { EditorStore } from '@/app/editor/active-store'

import { openACPChatSession, type ACPSession } from './acp/session'

async function closeAgentSession(session: ACPSession): Promise<void> {
  forgetAgentChat(session.chat)
  restAgents('acp', session.chat)
  try {
    await session.child.kill()
  } finally {
    setAgentChatModel(session.chat, null)
    releaseDesignVersion(session.chat)
  }
}

export { formatConnectionError } from '@/app/ai/agents/acp/errors'

/** One agent turn's tokens, as an ACP agent reports them with its answer to the prompt. */
export interface AgentTurnUsage {
  model: string | null
  /** All input tokens, cached ones included, as the AI SDK counts a provider model's input. */
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
}

/**
 * The agents report fresh input apart from cache reads and writes; the chat's other models count
 * all of it as input, with the cached part broken out.
 */
export function agentTurnUsage(usage: Usage, model: string | null): AgentTurnUsage {
  const cacheReadTokens = usage.cachedReadTokens ?? null
  const cacheWriteTokens = usage.cachedWriteTokens ?? null
  return {
    model,
    inputTokens: usage.inputTokens + (cacheReadTokens ?? 0) + (cacheWriteTokens ?? 0),
    outputTokens: usage.outputTokens,
    cacheReadTokens,
    cacheWriteTokens
  }
}

export function buildCrashChunks(
  destroying: boolean,
  textId: string,
  textStarted: boolean
): { chunks: UIMessageChunk[]; shouldNullSession: boolean } {
  if (destroying) return { chunks: [], shouldNullSession: false }
  const chunks: UIMessageChunk[] = []
  if (textStarted) chunks.push({ type: 'text-end', id: textId })
  chunks.push({ type: 'error', errorText: 'Agent process exited unexpectedly.' })
  chunks.push({ type: 'finish-step' })
  chunks.push({ type: 'finish', finishReason: 'error' })
  return { chunks, shouldNullSession: true }
}

// Startup also emits updates. Only updates from a real turn mean the adapter has a session to save.
const TURN_UPDATES: ReadonlySet<SessionUpdate['sessionUpdate']> = new Set([
  'user_message_chunk',
  'agent_message_chunk',
  'agent_thought_chunk',
  'tool_call',
  'tool_call_update',
  'plan'
])

export class ACPChatTransport implements ChatTransport<UIMessage> {
  private session: ACPSession | null = null
  private agentDef: ACPAgentDef
  private cwd: string
  private sentContext = false
  private resume: string | null
  private onSession: ((id: string | null) => void) | undefined
  private destroying = false
  /** The agent while it starts, before it becomes the session, so destroying can stop it. */
  private starting: TauriChild | null = null

  /** The chat's document, where each reply's run records the edits the agent makes in it. */
  private store: EditorStore | null
  private onUsage: ((usage: AgentTurnUsage) => void) | null
  private version: DesignVersionTarget | undefined

  constructor(options: {
    agentDef: ACPAgentDef
    cwd?: string
    store?: EditorStore
    version?: DesignVersionTarget
    /** Told each turn's tokens, which the Usage settings count with the chat's other models. */
    onUsage?: (usage: AgentTurnUsage) => void
    resume?: string | null
    onSession?: (id: string | null) => void
  }) {
    this.agentDef = options.agentDef
    this.cwd = options.cwd ?? '.'
    this.store = options.store ?? null
    this.version = options.version
    this.onUsage = options.onUsage ?? null
    this.resume = options.resume ?? null
    this.onSession = options.onSession
  }

  async sendMessages({
    messages,
    abortSignal
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    const text =
      lastUserMessage?.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n') ?? ''

    if (this.session?.dead) {
      this.session = null
    }

    if (!this.session) {
      const started = await this.spawnAgent(abortSignal)
      // Destroyed between startup and here: the agent is still `starting`, so stop it.
      if (this.destroying) {
        await closeAgentSession(started)
        throw new Error('The chat closed while its agent was starting.')
      }
      if (started.dead) {
        this.starting = null
        throw new Error('The agent stopped while it was starting.')
      }
      this.session = started
      this.starting = null
      this.sentContext = started.resumed
    }

    const carriesContext = !this.sentContext
    const designAssignment = this.version
      ? `You are creating an independent design alternative titled "${this.version.title}". Make one complete alternative for the request. Work only in the specified Brutal document and page. Your separate area is ${VERSION_WIDTH} × ${VERSION_HEIGHT} design units. Fit the design within it. Use preview_render to show a draft when useful. Use render once at the end, with JSX only, to commit your version. Brutal places it in your own frame. Use canvas tools only. Do not change other designs, files or settings.\n\n`
      : ''
    const promptText = carriesContext ? `${SYSTEM_PROMPT}\n\n${designAssignment}${text}` : text
    this.sentContext = true

    const { connection, sessionId } = this.session
    const session = this.session
    setAgentChatModel(session.chat, session.modelLabel ?? this.agentDef.name)

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        const mapper = createUpdateMapper(crypto.randomUUID())
        let closed = false
        // The reply's run collects the edits the agent's calls make in the chat's document.
        const store = this.store
        const run = store ? startAgentRun(store, session.chat) : null

        function finish(reason: 'stop' | 'other' | 'error', errorText?: string) {
          if (closed) return
          closed = true
          if (store && run) endRun(store, run)
          restAgents('acp', session.chat)
          if (errorText) controller.enqueue({ type: 'error', errorText })
          for (const chunk of mapper.end()) controller.enqueue(chunk)
          controller.enqueue({ type: 'finish-step' })
          controller.enqueue({ type: 'finish', finishReason: reason })
          session.onUpdate = null
          controller.close()
        }

        session.onUpdate = (params) => {
          if (closed) return
          if (params.update.sessionUpdate === 'usage_update' && session.modelLabel)
            setAgentChatModel(session.chat, session.modelLabel)
          if (TURN_UPDATES.has(params.update.sessionUpdate)) this.recordSession(sessionId)
          for (const chunk of mapper.map(params.update)) controller.enqueue(chunk)
        }

        abortSignal?.addEventListener('abort', () => {
          void connection.cancel({ sessionId }).catch(() => undefined)
          finish('stop')
        })

        controller.enqueue({ type: 'start' })
        controller.enqueue({ type: 'start-step' })

        // Stopped while the agent started and reached its tools: the abort event already fired.
        if (abortSignal?.aborted) {
          // The instructions went out with nothing, so the next message carries them.
          if (carriesContext) this.sentContext = false
          finish('stop')
          return
        }

        connection
          .prompt({
            sessionId,
            prompt: [{ type: 'text', text: promptText }]
          })
          // The prompt answers once the agent's turn is over; nothing else ends the reply.
          .then((result) => {
            this.recordSession(sessionId)
            if (result.usage) this.onUsage?.(agentTurnUsage(result.usage, session.model))
            finish(result.stopReason === 'end_turn' ? 'stop' : 'other')
            return undefined
          })
          .catch((e) => {
            recordACPTransportFailure({
              operation: 'message',
              ...describeDiagnosticError(e)
            })
            finish('error', formatConnectionError(e, this.agentDef))
          })
      }
    })
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null
  }

  async destroy(): Promise<void> {
    this.destroying = true
    const starting = this.starting
    this.starting = null
    await starting?.kill().catch(() => undefined)
    if (this.session) {
      await closeAgentSession(this.session)
      this.session = null
    }
  }

  private recordSession(id: string): void {
    if (!this.agentDef.resumesSessions || this.resume === id) return
    this.resume = id
    this.onSession?.(id)
  }

  private spawnAgent(signal?: AbortSignal): Promise<ACPSession> {
    return openACPChatSession({
      agentDef: this.agentDef,
      cwd: this.cwd,
      resume: this.resume,
      version: this.version,
      signal,
      destroying: () => this.destroying,
      onUnexpectedClose: (closed) => {
        if (this.session === closed) this.session = null
        forgetAgentChat(closed.chat)
        restAgents('acp', closed.chat)
        setAgentChatModel(closed.chat, null)
        releaseDesignVersion(closed.chat)
      },
      onStarting: (child) => {
        this.starting = child
      },
      onStartFailed: (child) => {
        if (this.starting === child) this.starting = null
      }
    }).catch((error: unknown) => {
      if (error instanceof AgentSessionResumeError && !this.destroying && !signal?.aborted)
        this.onSession?.(null)
      throw error
    })
  }
}
