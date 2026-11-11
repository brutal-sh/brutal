import { type CollaborationTicket } from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse } from '../response'
import { collaborationTicketResponseSchema } from '../schema'

export function createCollaborationRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async getCollaborationTicket(documentId: string): Promise<CollaborationTicket> {
      const response = await parseResponse(
        client.documents[':documentId']['collaboration-ticket'].$post({
          param: { documentId }
        }),
        collaborationTicketResponseSchema,
        options.onDiagnostic
      )
      return response.ticket
    }
  }
}
