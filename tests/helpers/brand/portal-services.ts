import type { Page } from '@playwright/test'
import * as v from 'valibot'

import {
  CLOUD_DISCOVERY_PATH,
  isCloudPortalPage,
  type CloudAccountStatus,
  type CloudAccountSession
} from '@open-pencil/cloud/contract'

import { cloudDiscoveryFixture } from '#tests/helpers/cloud/discovery'

import { mockEditorCopyServices } from './editor-services'

const deviceDecisionSchema = v.object({ userCode: v.string() })
const account: CloudAccountStatus = {
  state: 'active',
  user: {
    userId: 'test-owned-user',
    name: 'Ada Fixture',
    email: 'ada@studio.example',
    deploymentRole: 'user'
  }
}
const session: CloudAccountSession = {
  id: 'test-owned-session',
  current: true,
  method: 'desktop',
  ipAddress: '192.0.2.1',
  browser: null,
  system: null,
  createdAt: '2026-10-30T12:00:00Z',
  lastActiveAt: '2026-10-30T12:00:00Z',
  expiresAt: '2026-11-30T12:00:00Z'
}

/** Serve the real portal entry/router against local API fixtures, never an account server. */
export async function mockPortalCopyServices(page: Page, origin: string) {
  const remoteRequests = await mockEditorCopyServices(page)
  const backend = {
    signedIn: false,
    expired: false,
    approveFailures: 0,
    decisions: [] as { decision: string; code: string }[],
    requests: [] as string[],
    unexpected: [] as string[],
    remoteRequests
  }
  await page.route(
    (url) => url.origin === origin,
    async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const path = url.pathname
      if (request.isNavigationRequest() && isCloudPortalPage(path)) {
        // Simulate the Cloud server's document routing; Vite transforms the real entry.
        return route.fulfill({
          response: await route.fetch({ url: new URL('/cloud.html', origin).href })
        })
      }
      if (path === CLOUD_DISCOVERY_PATH)
        return route.fulfill({ json: cloudDiscoveryFixture(origin) })
      if (!path.startsWith('/api/')) return route.fallback()
      backend.requests.push(`${request.method()} ${path}`)
      if (path === '/api/account/status')
        return route.fulfill(
          backend.signedIn
            ? { json: account }
            : { status: 401, json: { error: 'test-owned signed-out account' } }
        )
      if (path === '/api/account/sessions') return route.fulfill({ json: { sessions: [session] } })
      if (path === '/api/account/sign-ins') return route.fulfill({ json: { signIns: [] } })
      if (path === '/api/auth/get-session') return route.fulfill({ json: null })
      if (path === '/api/auth/device' && request.method() === 'GET') {
        return route.fulfill(
          backend.expired
            ? { status: 400, json: { error_description: 'Test-owned expired code' } }
            : { json: { user_code: 'ABCD-EFGH', status: 'pending' } }
        )
      }
      if (path === '/api/auth/device/approve' || path === '/api/auth/device/deny') {
        const body = v.safeParse(
          v.pipe(v.string(), v.parseJson(), deviceDecisionSchema),
          request.postData() ?? ''
        )
        if (!body.success) {
          backend.unexpected.push(`${path}: invalid decision body`)
          return route.fulfill({
            status: 400,
            json: { error_description: 'Invalid fixture request' }
          })
        }
        const decision = path.endsWith('/approve') ? 'approve' : 'deny'
        backend.decisions.push({ decision, code: body.output.userCode })
        if (decision === 'approve' && backend.approveFailures > 0) {
          backend.approveFailures--
          return route.fulfill({
            status: 503,
            json: { error_description: 'Test-owned approval service unavailable' }
          })
        }
        return route.fulfill({ json: { success: true } })
      }
      backend.unexpected.push(`${request.method()} ${path}`)
      return route.fulfill({ status: 500, json: { error: 'Unexpected test-owned portal request' } })
    }
  )
  return backend
}
