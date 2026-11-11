import { aiTokenSchema, cloudSessionSchema, type AIToken, type CloudSession } from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'
import * as v from 'valibot'

import type { CloudRequestOptions } from '../api'
import { parseResponse, responseBody } from '../response'

export function createSessionRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async getSession(): Promise<CloudSession | null> {
      const response = await client.session.$get()
      if (response.status === 401) return null
      return v.parse(cloudSessionSchema, await responseBody(response, options.onDiagnostic))
    },
    /** A short-lived token for the deployment's AI service, on the workspace's behalf. */
    async requestAIToken(workspaceId: string): Promise<AIToken> {
      return parseResponse(
        client.ai.token.$post({ json: { workspaceId } }),
        aiTokenSchema,
        options.onDiagnostic
      )
    }
  }
}
