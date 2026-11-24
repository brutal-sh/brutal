import * as v from 'valibot'

import { IS_BROWSER } from '@open-pencil/core/constants'

const SIDEBAR_WIDTH_KEY = 'brutal:sidebar-width'
const LEGACY_LAYOUT_KEY = 'open-pen:editor-layout'
export const SIDEBAR_WIDTH = { initial: 320, min: 280, max: 700 } as const
const legacyLayoutSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.strictTuple([v.number(), v.number(), v.number()])
)

export function loadSidebarWidth(): number {
  if (!IS_BROWSER) return SIDEBAR_WIDTH.initial
  try {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    const legacy = v.safeParse(legacyLayoutSchema, localStorage.getItem(LEGACY_LAYOUT_KEY))
    const width =
      stored !== null
        ? Number(stored)
        : legacy.success
          ? (legacy.output[0] / 100) * (window.innerWidth - 16)
          : SIDEBAR_WIDTH.initial
    if (width === 0) return 0
    if (Number.isFinite(width) && width > 0) {
      return Math.max(SIDEBAR_WIDTH.min, Math.min(SIDEBAR_WIDTH.max, width))
    }
  } catch {
    // A window with unavailable storage starts at the normal width.
  }
  return SIDEBAR_WIDTH.initial
}

export function saveSidebarWidth(width: number): void {
  if (IS_BROWSER && Number.isFinite(width)) {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(width)))
    } catch {
      // Resizing still works when the preference cannot be persisted.
    }
  }
}
