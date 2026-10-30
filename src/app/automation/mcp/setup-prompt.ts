import dedent from 'dedent'

import { APP_VERSION } from '@/app/runtime/version'

import { MCP_INSTALL_COMMAND, type MCPFailure } from './failure'

/** Reasons the person can fix by installing the MCP server at this app's version. */
export function needsMCPInstall(failure: MCPFailure): boolean {
  return failure.code === 'not-installed' || failure.code === 'outdated'
}

/**
 * Markdown to paste into the agent the person connects over MCP, asking it to install the
 * server that matches this app when OpenPencil cannot do it with one click. Written for the
 * agent, so it stays in English.
 */
export function mcpServerSetupPrompt(failure: MCPFailure): string {
  const found =
    failure.code === 'outdated'
      ? `Open Pen found version ${failure.detail ?? 'an older version'} installed, which does not match the app.`
      : 'Open Pen could not find the `openpen-mcp-http` command.'
  return dedent`
    Help me set up the Open Pen fork's local canvas bridge. ${found}

    From my Open Pen checkout, build its packages with \`bun run build:packages\`, then run \`${MCP_INSTALL_COMMAND}\`.
    This developer installer builds and verifies a standalone bridge, installs it in my user-local Open Pen runtime, and installs the pinned Codex adapter.
    Preserve existing conflicting files, shell profiles, and credentials. Do not install the upstream @open-pencil/mcp package: this fork needs its own bridge.
    Confirm that \`openpen-mcp-http --version\` prints ${APP_VERSION}. The checkout is required for setup and rebuilding; the installed standalone bridge runs independently.

    Then tell me what you did. I will press "Restart MCP server" in Open Pen's Settings → MCP afterwards.
  `
}
