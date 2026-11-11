import {
  acceptedInvitationSchema,
  cloudUserProfileSchema,
  collaborationTicketSchema,
  documentAccessSchema,
  documentDownloadSchema,
  objectUploadSchema,
  documentGrantSchema,
  documentInvitationSchema,
  documentShareSchema,
  documentSummarySchema,
  sharedDocumentSchema,
  invitationPreviewSchema,
  resolvedDocumentShareSchema
} from '#cloud/contract'
import * as v from 'valibot'

export const documentsResponseSchema = v.object({ documents: v.array(documentSummarySchema) })
export const sharedDocumentsResponseSchema = v.object({ documents: v.array(sharedDocumentSchema) })
export const documentResponseSchema = v.object({ document: documentSummarySchema })
export const downloadResponseSchema = v.object({ document: documentDownloadSchema })
export const accessResponseSchema = v.object({ access: documentAccessSchema })
export const sharesResponseSchema = v.object({ shares: v.array(documentShareSchema) })
export const shareResponseSchema = v.object({ share: documentShareSchema })
export const shareCapabilityResponseSchema = v.object({
  share: documentShareSchema,
  secret: v.string(),
  path: v.string()
})
export const grantsResponseSchema = v.object({ grants: v.array(documentGrantSchema) })
export const grantResponseSchema = v.object({ grant: documentGrantSchema })
export const acceptedResponseSchema = v.object({ accepted: acceptedInvitationSchema })
export const invitationPreviewResponseSchema = v.object({ invitation: invitationPreviewSchema })
export const invitationsResponseSchema = v.object({
  invitations: v.array(documentInvitationSchema)
})
export const invitationCapabilityResponseSchema = v.object({
  invitation: documentInvitationSchema,
  token: v.string()
})
export const collaborationTicketResponseSchema = v.object({ ticket: collaborationTicketSchema })
export const resolvedShareResponseSchema = v.object({ resolution: resolvedDocumentShareSchema })
export const sharedDocumentResponseSchema = v.object({
  resolution: resolvedDocumentShareSchema,
  document: documentDownloadSchema
})
export const userLookupResponseSchema = v.object({ user: v.nullable(cloudUserProfileSchema) })
export const uploadResponseSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  upload: objectUploadSchema
})
export type CloudUpload = v.InferOutput<typeof uploadResponseSchema>
