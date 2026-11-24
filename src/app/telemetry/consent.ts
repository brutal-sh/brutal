import { computed, ref, watch } from 'vue'

import type { ConsentSource } from '@open-pencil/feedback/contract'
import { randomHex } from '@open-pencil/scene-graph/random'
import { locale } from '@open-pencil/vue/i18n'

import { IS_BRUTAL_MACOS_BETA } from '@/app/runtime/version'
import { appPreferences, updateSharingPreferences } from '@/app/settings/preferences/store'

import { USAGE_STATS_ENABLED } from './config'
import { sharingClient } from './instance'
import { sharingDisabledByEnvironment, sharingState } from './state'

/** Whether this build asks about usage stats at all: official builds, environment permitting. */
const askable = ref(false)

/**
 * Where the question is open, or `null`: `welcome` right after the first-run welcome closes,
 * `prompt` on a later launch, for installs that updated or never answered.
 */
export const usageStatsPrompt = ref<Exclude<ConsentSource, 'settings'> | null>(null)

export const usageStatsConsent = computed(() =>
  IS_BRUTAL_MACOS_BETA
    ? (appPreferences.value.sharing.brutalDetailedUsageStats ??
      (appPreferences.value.sharing.brutalUsageStats === 'denied' ? 'denied' : 'unset'))
    : appPreferences.value.sharing.usageStats
)

if (IS_BRUTAL_MACOS_BETA) {
  watch(
    usageStatsConsent,
    (answer) => {
      if (answer !== 'granted') sharingClient.discardPendingUsage()
    },
    { flush: 'sync' }
  )
}

/**
 * Starting to share makes a new random ID and records where the person agreed; stopping deletes
 * the ID and anything queued.
 */
export function setUsageStatsConsent(granted: boolean, source: ConsentSource): void {
  if (IS_BRUTAL_MACOS_BETA) {
    if (granted && !askable.value) return
    const previous = usageStatsConsent.value
    sharingState.value = {
      ...sharingState.value,
      brutalInstallId: granted ? (sharingState.value.brutalInstallId ?? randomHex(16)) : null,
      brutalLastPingDay: granted ? sharingState.value.brutalLastPingDay : null,
      brutalPingCount: granted ? sharingState.value.brutalPingCount : 0
    }
    const answer = granted ? 'granted' : 'denied'
    updateSharingPreferences({ brutalUsageStats: answer, brutalDetailedUsageStats: answer })
    usageStatsPrompt.value = null
    if (granted && previous !== 'granted') {
      sharingClient.trackUsage({ name: 'usage_stats_enabled', source })
      sharingClient.trackUsage({ name: 'app_opened', locale: locale.get() })
      void sharingClient.sendDailyPing()
    }
    return
  }
  updateSharingPreferences({ usageStats: granted ? 'granted' : 'denied' })
  sharingState.value = {
    ...sharingState.value,
    installId: granted ? (sharingState.value.installId ?? randomHex(16)) : null
  }
  usageStatsPrompt.value = null
  if (!granted) {
    sharingClient.discardPendingUsage()
    return
  }
  sharingClient.trackUsage({ name: 'usage_stats_enabled', source })
  sharingClient.trackUsage({ name: 'app_opened', locale: locale.get() })
}

/** Opens the question unless this build or environment sends nothing, or it was answered. */
export function offerUsageStatsPrompt(source: Exclude<ConsentSource, 'settings'>): void {
  if (!askable.value || usageStatsConsent.value !== 'unset') return
  usageStatsPrompt.value = source
}

export async function resolveUsageStatsQuestion(): Promise<void> {
  askable.value = USAGE_STATS_ENABLED && !(await sharingDisabledByEnvironment())
}
