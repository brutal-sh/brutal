import { BRUTAL_BETA_ORIGIN, BRUTAL_USAGE_ORIGIN } from '@open-pencil/feedback/brutal/schema'

import { IS_BRUTAL_MACOS_BETA } from '@/app/runtime/version'
import { IS_ROOM_BROWSER } from '@/constants'

/**
 * Whether this build may send anything. Only official release builds set the flag, so forks,
 * self-built apps, dev servers, and tests send no pings or usage stats.
 */
export const FEEDBACK_ENABLED =
  !IS_BRUTAL_MACOS_BETA &&
  !IS_ROOM_BROWSER &&
  import.meta.env.PROD &&
  import.meta.env.VITE_OPENPENCIL_FEEDBACK === 'on'

const brutalOrigin = import.meta.env.VITE_BRUTAL_USAGE_STATS_ORIGIN
export const BRUTAL_STATS_ORIGIN =
  IS_BRUTAL_MACOS_BETA &&
  !IS_ROOM_BROWSER &&
  import.meta.env.PROD &&
  (brutalOrigin === BRUTAL_USAGE_ORIGIN || brutalOrigin === BRUTAL_BETA_ORIGIN)
    ? brutalOrigin
    : null

export const USAGE_STATS_ENABLED = FEEDBACK_ENABLED || BRUTAL_STATS_ORIGIN !== null
