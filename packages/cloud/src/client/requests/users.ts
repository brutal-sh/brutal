import { type CloudUserProfile, type LookupCloudUserInput } from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse } from '../response'
import { userLookupResponseSchema } from '../schema'

export function createUserRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async lookupUser(
      documentId: string,
      input: LookupCloudUserInput
    ): Promise<CloudUserProfile | null> {
      const response = await parseResponse(
        client.documents[':documentId'].users.lookup.$post({
          param: { documentId },
          json: input
        }),
        userLookupResponseSchema,
        options.onDiagnostic
      )
      return response.user
    },
    async getUserProfile(documentId: string, userId: string): Promise<CloudUserProfile | null> {
      const response = await parseResponse(
        client.documents[':documentId'].users[':userId'].$get({
          param: { documentId, userId }
        }),
        userLookupResponseSchema,
        options.onDiagnostic
      )
      return response.user
    }
  }
}
