import type { Page } from '@playwright/test'

export const STORY_TIMEOUT_MS = 20_000

/** 'ok', or the first failure the open story reports. */
export function storyOutcome(page: Page): Promise<string> {
  return page.evaluate(
    (timeout) =>
      new Promise<string>((resolve) => {
        const channel: unknown = Reflect.get(window, '__STORYBOOK_ADDONS_CHANNEL__')
        if (typeof channel !== 'object' || channel === null || !('on' in channel)) {
          resolve('Storybook channel is missing')
          return
        }
        const on = channel.on as (event: string, listener: (detail?: unknown) => void) => void
        // Exceptions name what failed. storyFinished comes last, after afterEach, and its
        // reporters say whether anything else failed, axe's naming the rules it found broken.
        const failures: string[] = []
        const record = (kind: string) => (detail?: unknown) => {
          const message = detail instanceof Object && 'message' in detail ? detail.message : detail
          failures.push(`${kind}: ${String(message)}`)
        }
        on.call(channel, 'playFunctionThrewException', record('play function'))
        on.call(channel, 'storyThrewException', record('render'))
        on.call(channel, 'storyErrored', record('story'))
        on.call(channel, 'storyFinished', (detail?: unknown) => {
          const reporters =
            detail instanceof Object && 'reporters' in detail && Array.isArray(detail.reporters)
              ? detail.reporters
              : []
          for (const report of reporters) {
            const { type, status, result } = report as {
              type?: unknown
              status?: unknown
              result?: {
                violations?: { id: string; nodes: { target: unknown }[] }[]
              }
            }
            if (status !== 'failed') continue
            const violations = (result?.violations ?? []).map(
              (violation) =>
                `${violation.id} at ${violation.nodes.map((node) => String(node.target)).join(', ')}`
            )
            failures.push(
              `${String(type)} report failed${violations.length ? `: ${violations.join('; ')}` : ''}`
            )
          }
          resolve(failures[0] ?? 'ok')
        })
        setTimeout(() => resolve('timed out'), timeout)
      }),
    STORY_TIMEOUT_MS
  )
}
