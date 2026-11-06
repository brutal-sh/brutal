import { parseToolDescriptor, type ToolDescriptor } from '@open-pencil/mcp/tools'

import { APP_VERSION } from '@/app/runtime/version'

import { mcpFailure, MCP_INSTALL_COMMAND, MCP_PACKAGE_NAME, MCPStartupError } from './failure'

export interface AutomationHealth {
  status: 'ok' | 'no_app'
  version?: string
  authRequired?: boolean
  discoveryPath?: string
  tools?: ToolDescriptor[]
  /** The server tells the app when an agent opens a session, so a chat can wait for its agent. */
  agentSessionEvents?: boolean
}

interface AutomationHealthRecord {
  status?: unknown
  version?: unknown
  installCommand?: unknown
  authRequired?: unknown
  discoveryPath?: unknown
  tools?: unknown
  agentSessionEvents?: unknown
}

function isAutomationHealthRecord(value: unknown): value is AutomationHealthRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string' ? value : null
}

function optionalBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined
  return typeof value === 'boolean' ? value : null
}

function parseToolDescriptors(value: unknown): ToolDescriptor[] | null | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  const descriptors: ToolDescriptor[] = []
  for (const candidate of value) {
    const descriptor = parseToolDescriptor(candidate)
    if (!descriptor) return null
    descriptors.push(descriptor)
  }
  return descriptors
}

export function parseAutomationHealth(value: unknown): AutomationHealth | null {
  if (!isAutomationHealthRecord(value)) return null
  if (value.status !== 'ok' && value.status !== 'no_app') return null
  const version = optionalString(value.version)
  const authRequired = optionalBoolean(value.authRequired)
  const discoveryPath = optionalString(value.discoveryPath)
  const tools = parseToolDescriptors(value.tools)
  const agentSessionEvents = optionalBoolean(value.agentSessionEvents)
  if (
    version === null ||
    authRequired === null ||
    discoveryPath === null ||
    tools === null ||
    agentSessionEvents === null
  ) {
    return null
  }
  const health: AutomationHealth = { status: value.status }
  if (version !== undefined) health.version = version
  if (authRequired !== undefined) health.authRequired = authRequired
  if (discoveryPath !== undefined) health.discoveryPath = discoveryPath
  if (tools !== undefined) health.tools = tools
  if (agentSessionEvents !== undefined) health.agentSessionEvents = agentSessionEvents
  return health
}

/**
 * Returns the major.minor portion of a semver string (e.g. "0.5.1" → "0.5").
 * Returns null if the string is not parseable as semver.
 */
function parseMajorMinor(version: string): string | null {
  const match = version.match(/^(\d+)\.(\d+)/)
  return match ? `${match[1]}.${match[2]}` : null
}

export function assertCompatibleMCPVersion(health: AutomationHealth): void {
  const runningMajorMinor = health.version ? parseMajorMinor(health.version) : null
  const oursMajorMinor = parseMajorMinor(APP_VERSION)
  if (!oursMajorMinor) return
  if (runningMajorMinor === oursMajorMinor) return
  const runningVersion = health.version ? `v${health.version}` : 'an older version'
  // The running server's own install command names its own version, so the fix always
  // comes from this app's version.
  throw new MCPStartupError(
    `Open Pen desktop v${APP_VERSION} requires ${MCP_PACKAGE_NAME} v${oursMajorMinor}.x ` +
      `(major.minor compatibility), but the running MCP server is ${runningVersion}. ` +
      `Run: ${MCP_INSTALL_COMMAND}, then restart the MCP server.`,
    mcpFailure('outdated', health.version)
  )
}
