import { resolveCommand } from 'package-manager-detector/commands'
import { detect, getUserAgent } from 'package-manager-detector/detect'

import { MCP_VERSION } from '#mcp/version'

let installCommandPromise: Promise<string> | null = null

async function resolveMCPInstallCommand(): Promise<string> {
  const agent =
    getUserAgent() ??
    (
      await detect({
        strategies: ['install-metadata', 'lockfile', 'packageManager-field', 'devEngines-field']
      })
    )?.agent ??
    'npm'
  const resolved = resolveCommand(agent, 'global', [`@open-pencil/mcp@${MCP_VERSION}`])
  if (!resolved) return `npm install -g @open-pencil/mcp@${MCP_VERSION}`
  return [resolved.command, ...resolved.args].join(' ')
}

export function mcpInstallCommand(): Promise<string> {
  installCommandPromise ??= resolveMCPInstallCommand()
  return installCommandPromise
}
