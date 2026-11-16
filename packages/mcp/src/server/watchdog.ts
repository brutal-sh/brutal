import type { createBrowserRPCBridge } from '#mcp/browser-rpc'
import type { ServerHandle } from '#mcp/server/types'

const MAX_TIMER_MS = 2_147_483_647

export function validateTimeoutOption(name: string, timeoutMs: number | undefined): void {
  if (timeoutMs === undefined) return
  if (!Number.isSafeInteger(timeoutMs)) {
    throw new RangeError(`${name} must be a safe integer`)
  }
  if (timeoutMs < 0 || timeoutMs > MAX_TIMER_MS) {
    throw new RangeError(`${name} must be in the range 0–${MAX_TIMER_MS}`)
  }
}

/**
 * Closes an app-spawned server after it remains unattached for the configured
 * grace period. Registering an app cancels the pending shutdown; disconnecting
 * starts a fresh grace period so renderer reloads can reconnect without
 * leaving a permanently orphaned process behind.
 */
export function armAppAttachWatchdog(
  timeoutMs: number | undefined,
  browserRPC: ReturnType<typeof createBrowserRPCBridge>,
  handle: ServerHandle
): void {
  if (timeoutMs === undefined || timeoutMs === 0) return

  let timer: ReturnType<typeof setTimeout> | null = null
  let closing = false
  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }
  const armTimer = () => {
    clearTimer()
    timer = setTimeout(() => {
      timer = null
      if (browserRPC.isConnected() || closing) return
      closing = true
      unsubscribe()
      void handle.close().catch((e) => {
        console.error('[MCP] Watchdog: failed to close orphaned (no_app) server:', e)
      })
    }, timeoutMs)
    timer.unref()
  }
  const unsubscribe = browserRPC.subscribeConnectionChange((connected) => {
    if (connected) clearTimer()
    else armTimer()
  })
}
