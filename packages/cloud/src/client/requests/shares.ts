import {
  type CreateDocumentShareInput,
  type DocumentAccess,
  type DocumentShare,
  type UpdateDocumentShareInput
} from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse, responseBody } from '../response'
import {
  accessResponseSchema,
  sharesResponseSchema,
  shareResponseSchema,
  shareCapabilityResponseSchema
} from '../schema'

export function createDocumentAccessRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async getDocumentAccess(documentId: string): Promise<DocumentAccess> {
      const response = await parseResponse(
        client.documents[':documentId'].access.$get({ param: { documentId } }),
        accessResponseSchema,
        options.onDiagnostic
      )
      return response.access
    },
    async listDocumentShares(documentId: string): Promise<DocumentShare[]> {
      const response = await parseResponse(
        client.documents[':documentId'].shares.$get({ param: { documentId } }),
        sharesResponseSchema,
        options.onDiagnostic
      )
      return response.shares
    },
    async createDocumentShare(documentId: string, input: CreateDocumentShareInput) {
      return parseResponse(
        client.documents[':documentId'].shares.$post({
          param: { documentId },
          json: input
        }),
        shareCapabilityResponseSchema,
        options.onDiagnostic
      )
    }
  }
}

export function createDocumentShareRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async updateDocumentShare(
      documentId: string,
      shareId: string,
      input: UpdateDocumentShareInput
    ): Promise<DocumentShare> {
      const response = await parseResponse(
        client.documents[':documentId'].shares[':shareId'].$patch({
          param: { documentId, shareId },
          json: input
        }),
        shareResponseSchema,
        options.onDiagnostic
      )
      return response.share
    },
    async rotateDocumentShare(documentId: string, shareId: string) {
      return parseResponse(
        client.documents[':documentId'].shares[':shareId'].rotate.$post({
          param: { documentId, shareId }
        }),
        shareCapabilityResponseSchema,
        options.onDiagnostic
      )
    },
    async revokeDocumentShare(documentId: string, shareId: string): Promise<void> {
      await responseBody(
        await client.documents[':documentId'].shares[':shareId'].$delete({
          param: { documentId, shareId }
        }),
        options.onDiagnostic
      )
    }
  }
}
