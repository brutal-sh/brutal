import type { Page } from '@playwright/test'

import { CLOUD_PROTOCOL_VERSION, type CloudDiscovery } from '@open-pencil/cloud/contract'

/** Isolate editor acceptance from the availability of the public Cloud discovery server. */
export async function mockOfficialCloudDiscovery(page: Page): Promise<void> {
  await page.route('https://cloud.openpencil.dev/.well-known/openpencil', (route) =>
    route.fulfill({ json: cloudDiscoveryFixture('https://cloud.openpencil.dev') })
  )
}

/** A Cloud server's discovery at `origin`, with email sign-in. */
export function cloudDiscoveryFixture(origin = 'https://cloud.example.com'): CloudDiscovery {
  return {
    protocolVersion: CLOUD_PROTOCOL_VERSION,
    deployment: 'self-hosted',
    apiURL: `${origin}/api`,
    authURL: `${origin}/api/auth`,
    localEditor: true,
    authentication: {
      socialProviders: ['google'],
      enterpriseSSO: false,
      enrollmentMode: 'approval',
      emailPassword: { signIn: true, signUp: true, minimumPasswordLength: 8 }
    },
    capabilities: { documents: true, workspaces: true, collaboration: true }
  }
}
