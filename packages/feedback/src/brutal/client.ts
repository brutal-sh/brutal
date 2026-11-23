import { hc } from 'hono/client'

import type { BrutalUsageAPI } from './route'
import type { BrutalUsageBatch } from './schema'

export function createBrutalUsageClient(origin: string) {
  const client = hc<BrutalUsageAPI>(origin, {
    fetch(input: Parameters<typeof fetch>[0], init?: RequestInit) {
      const url = new URL(input instanceof Request ? input.url : input)
      // Use the website's JSON route so its trailing-slash rule does not redirect preflights.
      url.pathname += '.json'
      return globalThis.fetch(url, init)
    }
  })
  return async (batch: BrutalUsageBatch, { keepalive }: { keepalive?: boolean }) => {
    const init = {
      keepalive,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      redirect: 'error'
    } as const
    const response = await client.ingest.$post({ json: batch }, { init }).catch(() => null)
    return response?.ok ?? false
  }
}
