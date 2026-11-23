import { createBrutalUsageClient } from '@open-pencil/feedback/brutal/client'

import { feedback } from '@/app/feedback/client'
import { APP_RELEASE_VERSION, IS_BRUTAL_MACOS_BETA } from '@/app/runtime/version'
import { appPreferences } from '@/app/settings/preferences/store'

import { currentBuild } from './build'
import { createSharingClient } from './client'
import { BRUTAL_STATS_ORIGIN, USAGE_STATS_ENABLED } from './config'
import { sharingDisabledByEnvironment, sharingState } from './state'

async function accepted(request: Promise<Response>): Promise<boolean> {
  const response = await request.catch(() => null)
  return response?.ok ?? false
}

const brutal = BRUTAL_STATS_ORIGIN ? createBrutalUsageClient(BRUTAL_STATS_ORIGIN) : null

/** The app's one sharing client, sending to its product's receiver when the build allows. */
export const sharingClient = createSharingClient({
  enabled: USAGE_STATS_ENABLED,
  preferences: () => appPreferences.value.sharing,
  state: sharingState,
  build: currentBuild,
  disabledByEnvironment: sharingDisabledByEnvironment,
  send: IS_BRUTAL_MACOS_BETA
    ? {
        version: APP_RELEASE_VERSION,
        aggregate: brutal ?? (async () => false)
      }
    : {
        ping: (ping) => accepted(feedback.ping.$post({ json: ping })),
        ingest: (batch, { keepalive }) =>
          accepted(feedback.ingest.$post({ json: batch }, { init: { keepalive } }))
      }
})
