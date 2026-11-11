import { type CollaborationTicket, type ResolveDocumentShareInput } from '#cloud/contract'
import type { PublicCloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse } from '../response'
import {
  collaborationTicketResponseSchema,
  resolvedShareResponseSchema,
  sharedDocumentResponseSchema
} from '../schema'

export function createSharedDocumentRequests(
  publicClient: ReturnType<typeof hc<PublicCloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async resolveDocumentShare(shareId: string, input: ResolveDocumentShareInput) {
      const response = await parseResponse(
        publicClient.shares[':shareId'].resolve.$post({
          param: { shareId },
          json: input
        }),
        resolvedShareResponseSchema,
        options.onDiagnostic
      )
      return response.resolution
    },
    async getSharedDocument(shareId: string, input: ResolveDocumentShareInput) {
      return parseResponse(
        publicClient.shares[':shareId'].document.$post({
          param: { shareId },
          json: input
        }),
        sharedDocumentResponseSchema,
        options.onDiagnostic
      )
    },
    async getSharedCollaborationTicket(
      shareId: string,
      input: ResolveDocumentShareInput
    ): Promise<CollaborationTicket> {
      const response = await parseResponse(
        publicClient.shares[':shareId']['collaboration-ticket'].$post({
          param: { shareId },
          json: input
        }),
        collaborationTicketResponseSchema,
        options.onDiagnostic
      )
      return response.ticket
    }
  }
}
