import {
  createInvitationContinuationSchema,
  invitationContinuationSchema,
  type AcceptDocumentInvitationInput,
  type CreateInvitationContinuationInput,
  type InvitationContinuation,
  type CreateDocumentInvitationInput,
  type DocumentInvitation,
  type InvitationPreview,
  type AcceptedInvitation
} from '#cloud/contract'
import type { CloudAPI, PublicCloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'

import type { CloudRequestOptions } from '../api'
import { parseResponse, responseBody } from '../response'
import {
  acceptedResponseSchema,
  invitationPreviewResponseSchema,
  invitationsResponseSchema,
  invitationCapabilityResponseSchema
} from '../schema'

export function createDocumentInvitationRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async listDocumentInvitations(documentId: string): Promise<DocumentInvitation[]> {
      const response = await parseResponse(
        client.documents[':documentId'].invitations.$get({ param: { documentId } }),
        invitationsResponseSchema,
        options.onDiagnostic
      )
      return response.invitations
    },
    async createDocumentInvitation(documentId: string, input: CreateDocumentInvitationInput) {
      return parseResponse(
        client.documents[':documentId'].invitations.$post({
          param: { documentId },
          json: input
        }),
        invitationCapabilityResponseSchema,
        options.onDiagnostic
      )
    }
  }
}

export function createInvitationContinuationRequests(
  publicClient: ReturnType<typeof hc<PublicCloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async createInvitationContinuation(
      input: CreateInvitationContinuationInput
    ): Promise<InvitationContinuation> {
      return parseResponse(
        publicClient.invitations.continuations.$post({ json: input }),
        invitationContinuationSchema,
        options.onDiagnostic
      )
    },
    async consumeInvitationContinuation(id: string): Promise<CreateInvitationContinuationInput> {
      return parseResponse(
        publicClient.invitations.continuations[':continuationId'].consume.$post({
          param: { continuationId: id }
        }),
        createInvitationContinuationSchema,
        options.onDiagnostic
      )
    }
  }
}

export function createInvitationRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  publicClient: ReturnType<typeof hc<PublicCloudAPI>>,
  options: CloudRequestOptions
) {
  return {
    async previewInvitation(
      invitationId: string,
      input: AcceptDocumentInvitationInput
    ): Promise<InvitationPreview> {
      const response = await parseResponse(
        publicClient.invitations[':invitationId'].preview.$post({
          param: { invitationId },
          json: input
        }),
        invitationPreviewResponseSchema,
        options.onDiagnostic
      )
      return response.invitation
    },
    /** Accepts a document or workspace invitation, and says which it was. */
    async acceptInvitation(
      invitationId: string,
      input: AcceptDocumentInvitationInput
    ): Promise<AcceptedInvitation> {
      const response = await parseResponse(
        client.invitations[':invitationId'].accept.$post({
          param: { invitationId },
          json: input
        }),
        acceptedResponseSchema,
        options.onDiagnostic
      )
      return response.accepted
    },
    async revokeDocumentInvitation(documentId: string, invitationId: string): Promise<void> {
      await responseBody(
        await client.documents[':documentId'].invitations[':invitationId'].$delete({
          param: { documentId, invitationId }
        }),
        options.onDiagnostic
      )
    }
  }
}
