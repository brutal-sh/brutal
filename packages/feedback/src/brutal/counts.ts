import type { D1Database } from '@cloudflare/workers-types/index'
import { CamelCasePlugin, Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'

import { utcDayOf } from '../days'
import type { BrutalUsageBatch } from './schema'

export const RETENTION_DAYS = 90

interface UsageCount {
  day: string
  version: string
  event: BrutalUsageBatch['events'][number]['name']
  format: string
  count: number
}

function usageDatabase(database: D1Database) {
  return new Kysely<{ usageCounts: UsageCount }>({
    dialect: new D1Dialect({ database }),
    plugins: [new CamelCasePlugin()]
  })
}

export async function recordUsage(db: D1Database, batch: BrutalUsageBatch, now: Date) {
  const day = utcDayOf(now).toString()
  await usageDatabase(db)
    .insertInto('usageCounts')
    .values(
      batch.events.map((event) => ({
        day,
        version: batch.version,
        event: event.name,
        format: 'format' in event ? event.format : '',
        count: 1
      }))
    )
    .onConflict((conflict) =>
      conflict
        .columns(['day', 'version', 'event', 'format'])
        .doUpdateSet((eb) => ({ count: eb('usageCounts.count', '+', 1) }))
    )
    .execute()
}

export async function expireUsage(db: D1Database, now: Date) {
  const firstDay = utcDayOf(now)
    .subtract({ days: RETENTION_DAYS - 1 })
    .toString()
  await usageDatabase(db).deleteFrom('usageCounts').where('day', '<', firstDay).execute()
}
