import { computed, onMounted, ref } from 'vue'

import { appPreferences, updateSharingPreferences } from '@/app/settings/preferences/store'

import { USAGE_STATS_ENABLED } from './config'
import { setUsageStatsConsent, usageStatsConsent } from './consent'
import { qaUsageAvailable, qaUsageEnabled, setQaUsageEnabled } from './instance'
import { sharingDisabledByEnvironment } from './state'

/** The Sharing section's switches, and why nothing is sent when nothing can be. */
export function useSharingSettings() {
  const disabledByEnvironment = ref(false)
  onMounted(async () => {
    disabledByEnvironment.value = await sharingDisabledByEnvironment()
  })

  return {
    dailyPing: computed({
      get: () => appPreferences.value.sharing.dailyPing,
      set: (dailyPing: boolean) => updateSharingPreferences({ dailyPing })
    }),
    usageStats: computed({
      get: () => usageStatsConsent.value === 'granted',
      set: (granted: boolean) => setUsageStatsConsent(granted, 'settings')
    }),
    qaUsageAvailable,
    qaUsage: computed({ get: () => qaUsageEnabled.value, set: setQaUsageEnabled }),
    unofficialBuild: !USAGE_STATS_ENABLED,
    disabledByEnvironment
  }
}
