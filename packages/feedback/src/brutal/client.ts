import { hc } from 'hono/client'

import type { BrutalUsageAPI } from './route'
import type { BrutalUsageBatch } from './schema'

export function createBrutalUsageClient(origin: string) {
  const client = hc<BrutalUsageAPI>(origin)
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
