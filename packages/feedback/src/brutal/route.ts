import type { D1Database, RateLimit } from '@cloudflare/workers-types/index'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'

import { validatedJSON } from '../http/request'
import { recordUsage } from './counts'
import { brutalUsageBatchSchema } from './schema'

export interface BrutalBindings {
  DB: D1Database
  INGEST_LIMITER: RateLimit
  PUBLIC_INGEST_HOST?: string
  STAGING_INGEST_TOKEN?: string
}

type BrutalEnv = { Bindings: BrutalBindings }

const MAX_BODY_BYTES = 4096

export const brutalUsageRoutes = new Hono<BrutalEnv>()
  .use(
    '/ingest',
    cors({ origin: 'tauri://localhost', allowMethods: ['POST'], allowHeaders: ['Content-Type'] })
  )
  .post(
    '/ingest',
    async (c, next) => {
      const token = c.env.STAGING_INGEST_TOKEN
      const staging = token && c.req.header('authorization') === `Bearer ${token}`
      const enabled = c.env.PUBLIC_INGEST_HOST === new URL(c.req.url).host
      if (!enabled && !staging) {
        return c.body(null, 401)
      }
      const key = c.req.header('cf-connecting-ip') ?? 'unknown'
      const { success } = await c.env.INGEST_LIMITER.limit({ key })
      if (!success) return c.body(null, 429)
      return next()
    },
    bodyLimit({ maxSize: MAX_BODY_BYTES }),
    validatedJSON(brutalUsageBatchSchema),
    async (c) => {
      await recordUsage(c.env.DB, c.req.valid('json'), new Date())
      return c.body(null, 204)
    }
  )

export type BrutalUsageAPI = typeof brutalUsageRoutes
