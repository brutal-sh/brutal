/** ACP agents, direct AI providers, and the models each provider recommends. */

export type ACPAgentID = 'claude-code' | 'codex' | 'gemini-cli'

export interface ACPAgentDef {
  id: ACPAgentID
  name: string
  command: string
  args: string[]
  /** The agent's own CLI, when the ACP program is a separate adapter for it. */
  cliCommand?: string
  /** The adapter is known to continue saved sessions through ACP session/resume. */
  resumesSessions?: boolean
  /** npm package that provides `command` when it is an adapter. */
  adapterPackage?: string
  /** The vendor's installation guide for the agent itself. */
  setupURL?: string
  installCommand?: string
  /**
   * The ACP auth method setup signs in with, once the agent offers it. `acp` methods run inside
   * the agent through `authenticate`; `terminal` methods run the agent's command with `args`,
   * which the desktop shell scope pins under `<command>-sign-in`.
   */
  signIn?: { via: 'acp'; method: string } | { via: 'terminal'; method: string; args: string[] }
}

export const ACP_AGENTS: ACPAgentDef[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    command: 'claude-agent-acp',
    args: [],
    cliCommand: 'claude',
    adapterPackage: '@agentclientprotocol/claude-agent-acp',
    setupURL: 'https://code.claude.com/docs/en/setup',
    installCommand: 'npm i -g @agentclientprotocol/claude-agent-acp',
    signIn: {
      via: 'terminal',
      method: 'claude-ai-login',
      args: ['--cli', 'auth', 'login', '--claudeai']
    },
    resumesSessions: true
  },
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex-acp',
    args: [],
    cliCommand: 'codex',
    adapterPackage: '@agentclientprotocol/codex-acp',
    setupURL: 'https://developers.openai.com/codex/cli',
    installCommand: 'npm i -g @agentclientprotocol/codex-acp',
    signIn: { via: 'acp', method: 'chat-gpt' },
    resumesSessions: true
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    command: 'gemini',
    args: ['--acp'],
    setupURL: 'https://geminicli.com/docs/get-started/installation/',
    installCommand: 'npm i -g @google/gemini-cli'
  }
]
