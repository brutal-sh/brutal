import {
  type CommitUploadRequest,
  type CreateUploadInput,
  type DocumentSummary
} from '#cloud/contract'
import type { CloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse } from '../response'
import { documentResponseSchema, uploadResponseSchema, type CloudUpload } from '../schema'

export function createUploadRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async createUpload(documentId: string, input: CreateUploadInput): Promise<CloudUpload> {
      return parseResponse(
        client.documents[':documentId'].uploads.$post({
          param: { documentId },
          json: input
        }),
        uploadResponseSchema,
        options.onDiagnostic
      )
    },
    async commitUpload(uploadId: string, input: CommitUploadRequest): Promise<DocumentSummary> {
      const response = await parseResponse(
        client.uploads[':uploadId'].commit.$post({
          param: { uploadId },
          json: { ...input, images: input.images ?? [] }
        }),
        documentResponseSchema,
        options.onDiagnostic
      )
      return response.document
    }
  }
}
