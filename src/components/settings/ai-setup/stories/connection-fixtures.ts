import { ACP_AGENTS, type ACPAgentID } from '@open-pencil/core/constants'

import type { AgentAccount } from '@/app/ai/agents/setup/accounts'
import type { DetectedAgent } from '@/app/ai/agents/setup/discovery'
import type { AgentSetupState, PiSetupState } from '@/app/ai/agents/setup/view'

export interface ConnectionStoryArgs {
  providerID:
    | 'openrouter'
    | 'anthropic'
    | 'openai-compatible'
    | 'acp:claude-code'
    | 'acp:codex'
    | 'harness:pi'
  signInStatus: 'idle' | 'waiting' | 'verifying' | 'blocked' | 'cancelled' | 'expired' | 'failed'
  account: { label: string; freeTier: boolean } | null
  agentSetup?: AgentSetupState
  piSetup?: PiSetupState
  hasSavedKey: boolean
  recommended: boolean
}

export function detected(id: ACPAgentID, status: DetectedAgent['status']): DetectedAgent {
  const definition = ACP_AGENTS.find((agent) => agent.id === id) ?? ACP_AGENTS[0]
  return {
    definition,
    cliPath:
      status === 'needs-adapter'
        ? `/usr/local/bin/${definition.cliCommand ?? definition.command}`
        : null,
    adapterPath: null,
    status
  }
}

export function agentSetup(overrides: Partial<AgentSetupState>): AgentSetupState {
  return {
    supported: true,
    checked: true,
    scanning: false,
    detected: null,
    bridge: false,
    bridgeOutdated: false,
    bridgeCommand: 'npm i -g @open-pencil/mcp@0.15.1',
    npm: true,
    installingAgent: false,
    installingBridge: false,
    error: null,
    ...overrides
  }
}

export function account(overrides: Partial<AgentAccount>): AgentAccount {
  return {
    checking: false,
    status: { kind: 'none', label: 'Not logged in' },
    adapter: { name: '@agentclientprotocol/claude-agent-acp', version: '0.93.0' },
    canSignIn: true,
    signingIn: false,
    signInURL: null,
    acceptsCode: false,
    tools: null,
    error: null,
    ...overrides
  }
}

export function piSetup(overrides: Partial<PiSetupState>): PiSetupState {
  return {
    supported: true,
    checked: true,
    scanning: false,
    companion: false,
    companionOutdated: false,
    companionCommand: 'npm i -g @open-pencil/harness@0.15.1',
    bridge: false,
    bridgeOutdated: false,
    bridgeCommand: 'npm i -g @open-pencil/mcp@0.15.1',
    npm: true,
    installingCompanion: false,
    installingBridge: false,
    defaultModel: null,
    error: null,
    ...overrides
  }
}

export const connectionDefaults: ConnectionStoryArgs = {
  providerID: 'openrouter',
  signInStatus: 'idle',
  hasSavedKey: false,
  recommended: true,
  account: null
}

export function codexToolsUnavailable(
  reason:
    | string
    | null = '[codex-acp] MCP server `open-pencil` was not started, because the Codex config already defines an MCP server with this name.'
): AgentSetupState {
  return agentSetup({
    detected: detected('codex', 'available'),
    bridge: true,
    account: account({
      status: { kind: 'account', label: 'ChatGPT Pro', account: { email: 'ada@example.com' } },
      adapter: { name: '@agentclientprotocol/codex-acp', version: '2.2.2' },
      tools: { connected: false, reason }
    })
  })
}

export function connectionState(account: ConnectionStoryArgs['account']) {
  return {
    apiKey: account ? 'sk-or-story' : '',
    customBaseURL: '',
    customModelID: '',
    test: 'idle',
    reason: null,
    account
  }
}
