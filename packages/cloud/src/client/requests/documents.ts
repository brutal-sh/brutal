import {
  type CreateDocumentInput,
  type DocumentDownload,
  type DocumentSummary,
  type SharedDocument
} from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse, responseBody } from '../response'
import {
  documentsResponseSchema,
  sharedDocumentsResponseSchema,
  documentResponseSchema,
  downloadResponseSchema
} from '../schema'

export function createDocumentRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    /** Documents shared with the person directly, outside their workspaces. */
    async listSharedDocuments(): Promise<SharedDocument[]> {
      const response = await parseResponse(
        client['shared-documents'].$get(),
        sharedDocumentsResponseSchema,
        options.onDiagnostic
      )
      return response.documents
    },
    async listDocuments(workspaceId: string): Promise<DocumentSummary[]> {
      const response = await parseResponse(
        client.workspaces[':workspaceId'].documents.$get({
          param: { workspaceId }
        }),
        documentsResponseSchema,
        options.onDiagnostic
      )
      return response.documents
    },
    async createDocument(
      workspaceId: string,
      input: CreateDocumentInput
    ): Promise<DocumentSummary> {
      const response = await parseResponse(
        client.workspaces[':workspaceId'].documents.$post({
          param: { workspaceId },
          json: input
        }),
        documentResponseSchema,
        options.onDiagnostic
      )
      return response.document
    }
  }
}

export function createDocumentContentRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async deleteDocument(documentId: string): Promise<void> {
      await responseBody(
        await client.documents[':documentId'].$delete({ param: { documentId } }),
        options.onDiagnostic
      )
    },
    async getDocument(documentId: string): Promise<DocumentDownload> {
      const response = await parseResponse(
        client.documents[':documentId'].$get({ param: { documentId } }),
        downloadResponseSchema,
        options.onDiagnostic
      )
      return response.document
    }
  }
}
