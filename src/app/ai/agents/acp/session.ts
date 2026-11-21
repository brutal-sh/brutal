import type {
  ClientSideConnection,
  InitializeResponse,
  McpServer,
  NewSessionResponse
} from '@agentclientprotocol/sdk'

import type { ACPAgentDef } from '@open-pencil/core/constants'

import { isAuthRequiredError } from './errors'
import type { OwnToolsLink } from './tools'

type SessionConnection = Pick<ClientSideConnection, 'newSession' | 'unstable_resumeSession'>

export class AgentSessionResumeError extends Error {
  override name = 'AgentSessionResumeError'

  constructor(agent: ACPAgentDef, cause?: unknown) {
    super(
      `${agent.name} could not continue this conversation's session. Start a new chat to continue working.`,
      { cause }
    )
  }
}

/** Resumes without replaying the transcript the editor already has. */
export async function openAgentSession(
  connection: SessionConnection,
  agent: ACPAgentDef,
  initialized: InitializeResponse,
  request: { cwd: string; mcpServers: McpServer[]; _meta: OwnToolsLink['meta'] },
  resume: string | null
): Promise<NewSessionResponse> {
  if (resume === null) return connection.newSession(request)
  if (!agent.resumesSessions || !initialized.agentCapabilities?.sessionCapabilities?.resume) {
    throw new AgentSessionResumeError(agent)
  }

  try {
    const result = await connection.unstable_resumeSession({ ...request, sessionId: resume })
    return { ...result, sessionId: resume }
  } catch (cause) {
    if (isAuthRequiredError(cause)) throw cause
    throw new AgentSessionResumeError(agent, cause)
  }
}
