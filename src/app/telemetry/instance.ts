import { computed, ref, shallowRef } from 'vue'

import { createBrutalUsageClient } from '@open-pencil/feedback/brutal/client'
import type { BrutalUsageBatch } from '@open-pencil/feedback/brutal/schema'

import { feedback } from '@/app/feedback/client'
import { APP_RELEASE_VERSION, IS_BRUTAL_MACOS_BETA } from '@/app/runtime/version'
import { appPreferences } from '@/app/settings/preferences/store'
import { IS_TAURI } from '@/constants'

import { currentBuild } from './build'
import { createSharingClient } from './client'
import { BRUTAL_STATS_ORIGIN, USAGE_STATS_ENABLED } from './config'
import { sharingDisabledByEnvironment, sharingState } from './state'

async function accepted(request: Promise<Response>): Promise<boolean> {
  const response = await request.catch(() => null)
  return response?.ok ?? false
}

const brutal = BRUTAL_STATS_ORIGIN ? createBrutalUsageClient(BRUTAL_STATS_ORIGIN) : null

interface QaUsageStatus {
  requestedAtLaunch: boolean
  configured: boolean
}

const qaStatus = shallowRef<QaUsageStatus | null>(null)
const qaSelection = ref<boolean>()
const initialQaMode =
  brutal && IS_TAURI
    ? import('@tauri-apps/api/core')
        .then(({ invoke }) => invoke<QaUsageStatus>('qa_usage_status'))
        .then((status) => {
          qaStatus.value = status
          return status.requestedAtLaunch
        })
        .catch(() => null)
    : Promise.resolve(false)

export const qaUsageEnabled = computed(
  () => qaSelection.value ?? qaStatus.value?.requestedAtLaunch ?? false
)
export const qaUsageAvailable = computed(() => qaUsageEnabled.value || !!qaStatus.value?.configured)

export function setQaUsageEnabled(enabled: boolean): void {
  if (enabled === qaUsageEnabled.value || (enabled && !qaStatus.value?.configured)) return
  // Take the pending events with their current destination before changing the switch.
  void sharingClient.flushUsage()
  qaSelection.value = enabled
}

async function sendBrutalUsage(
  batch: BrutalUsageBatch,
  options: { keepalive?: boolean },
  mode: boolean | Promise<boolean | null>
): Promise<boolean> {
  if (!brutal) return false
  const qa = await mode
  if (qa === null) return false
  if (qa) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<boolean>('send_qa_usage', { batch }).catch(() => false)
  }
  return brutal(batch, options)
}

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
        get aggregate() {
          const mode = qaSelection.value ?? initialQaMode
          return (batch: BrutalUsageBatch, options: { keepalive?: boolean }) =>
            sendBrutalUsage(batch, options, mode)
        }
      }
    : {
        ping: (ping) => accepted(feedback.ping.$post({ json: ping })),
        ingest: (batch, { keepalive }) =>
          accepted(feedback.ingest.$post({ json: batch }, { init: { keepalive } }))
      }
})
