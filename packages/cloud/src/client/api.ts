import type { CloudFetch } from '#cloud/client/discovery'
import type { CloudAPI, PublicCloudAPI } from '#cloud/server/api'
import { hc } from 'hono/client'

import { createImageRequests } from './images'
import { createCollaborationRequests } from './requests/collaboration'
import { createDocumentRequests, createDocumentContentRequests } from './requests/documents'
import { createDocumentGrantRequests } from './requests/grants'
import {
  createDocumentInvitationRequests,
  createInvitationContinuationRequests,
  createInvitationRequests
} from './requests/invitations'
import { createSessionRequests } from './requests/session'
import { createSharedDocumentRequests } from './requests/shared-documents'
import { createDocumentAccessRequests, createDocumentShareRequests } from './requests/shares'
import { createUploadRequests } from './requests/uploads'
import { createUserRequests } from './requests/users'
import {
  createVersionHistoryRequests,
  createVersionEditRequests,
  createVersionRestoreRequests
} from './requests/versions'
import { CloudAPIError, type CloudClientDiagnostic } from './response'
import { createWorkspaceRequests } from './workspaces'
export { CloudAPIError, type CloudClientDiagnostic } from './response'
export type { CloudUpload } from './schema'

export type CloudRequestOptions = {
  fetch?: CloudFetch
  signal?: AbortSignal
  accessToken?: string
  onDiagnostic?: CloudClientDiagnostic
}

function apiURL(baseURL: string): string {
  const url = new URL(baseURL)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new CloudAPIError('Cloud API URL must use HTTP or HTTPS', 0)
  }
  url.pathname = url.pathname.replace(/\/$/, '')
  url.search = ''
  url.hash = ''
  return url.href
}

export function createCloudAPIClient(baseURL: string, options: CloudRequestOptions = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
  }
  const client = hc<CloudAPI>(apiURL(baseURL), {
    fetch: options.fetch,
    init: { credentials: 'include', signal: options.signal, headers }
  })
  const publicClient = hc<PublicCloudAPI>(apiURL(baseURL), {
    fetch: options.fetch,
    init: { credentials: 'include', signal: options.signal, headers }
  })
  return {
    ...createSessionRequests(client, options),
    ...createUserRequests(client, options),
    ...createWorkspaceRequests(client, options.onDiagnostic),
    ...createImageRequests(client, publicClient, options.onDiagnostic),
    ...createDocumentRequests(client, options),
    ...createDocumentContentRequests(client, options),
    ...createDocumentAccessRequests(client, options),
    ...createDocumentShareRequests(client, options),
    ...createDocumentGrantRequests(client, options),
    ...createDocumentInvitationRequests(client, options),
    ...createInvitationContinuationRequests(publicClient, options),
    ...createInvitationRequests(client, publicClient, options),
    ...createSharedDocumentRequests(publicClient, options),
    ...createCollaborationRequests(client, options),
    ...createUploadRequests(client, options),
    ...createVersionHistoryRequests(client, options),
    ...createVersionEditRequests(client, options),
    ...createVersionRestoreRequests(client, options)
  }
}

export type CloudAPIClient = ReturnType<typeof createCloudAPIClient>
