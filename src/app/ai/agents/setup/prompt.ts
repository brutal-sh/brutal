import dedent from 'dedent'

import { ACP_AGENTS, type ACPAgentID } from '@open-pencil/core/constants'

import { MCP_INSTALL_COMMAND } from '@/app/automation/mcp/failure'
import { CODING_AGENTS_GUIDE_URL } from '@/constants'

const SIGN_IN: Record<ACPAgentID, string> = {
  'claude-code':
    'Make sure I am signed in to Claude Code: run `claude` and use `/login` if it asks me to sign in.',
  codex: 'If I am not signed in to Codex, have me use Sign in in Brutal’s Codex setup.',
  'gemini-cli': 'Make sure I am signed in to Gemini CLI: run `gemini` and choose a sign-in method.'
}

export function codingAgentGuideURL(agentID: ACPAgentID): string {
  return `${CODING_AGENTS_GUIDE_URL}#${agentID}`
}

/**
 * Markdown to paste into a coding agent the person already uses, asking it to install what
 * Brutal needs to start it. Written for the agent, so it stays in English.
 */
export function codingAgentSetupPrompt(agentID: ACPAgentID, bridgeReady: boolean): string {
  const agent = ACP_AGENTS.find((candidate) => candidate.id === agentID)
  if (!agent) return ''
  const install = agent.installCommand ?? `Install ${agent.name}`
  const bridgeStep = bridgeReady
    ? 'Brutal has already detected its compatible canvas bridge.'
    : dedent`
        If the canvas bridge is missing from a developer build, run \`${MCP_INSTALL_COMMAND}\`
        from the built Brutal checkout. For the packaged Mac beta, reinstall the
        app if it cannot find its bundled bridge. Use Brutal's bridge with either build.
      `
  return dedent`
    Help me connect ${agent.name} to Brutal, a desktop design editor. Brutal starts ${agent.name} through the Agent Client Protocol and provides canvas tools through its local MCP bridge.

    Please do this for me:

    1. If \`${agent.command}\` is not on my PATH, install it: \`${install}\`
    2. If npm fails with a permission error (EACCES), set up a global npm folder in my home directory (for example \`npm config set prefix ~/.npm-global\` and add \`~/.npm-global/bin\` to my PATH) and install again. Use sudo only if I agree.
    3. Confirm \`${agent.command}\` is found with \`which\` (\`where\` on Windows). If a global npm folder is missing from my PATH, tell me how to add it.
    4. ${SIGN_IN[agentID]}

    ${bridgeStep}

    Then tell me what you installed and anything I still need to do myself. I will press "Check again" in Brutal's AI setup afterwards.

    Setup guide: ${codingAgentGuideURL(agentID)}
  `
}
