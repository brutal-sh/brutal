import { type DocumentGrant, type PutDocumentGrantInput } from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse, responseBody } from '../response'
import { grantsResponseSchema, grantResponseSchema } from '../schema'

export function createDocumentGrantRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async listDocumentGrants(documentId: string): Promise<DocumentGrant[]> {
      const response = await parseResponse(
        client.documents[':documentId'].grants.$get({ param: { documentId } }),
        grantsResponseSchema,
        options.onDiagnostic
      )
      return response.grants
    },
    async putDocumentGrant(
      documentId: string,
      userId: string,
      input: PutDocumentGrantInput
    ): Promise<DocumentGrant> {
      const response = await parseResponse(
        client.documents[':documentId'].grants[':userId'].$put({
          param: { documentId, userId },
          json: input
        }),
        grantResponseSchema,
        options.onDiagnostic
      )
      return response.grant
    },
    async revokeDocumentGrant(documentId: string, userId: string): Promise<void> {
      await responseBody(
        await client.documents[':documentId'].grants[':userId'].$delete({
          param: { documentId, userId }
        }),
        options.onDiagnostic
      )
    }
  }
}
