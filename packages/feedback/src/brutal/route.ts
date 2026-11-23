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
  BRUTAL_TELEMETRY_PROXY_TOKEN?: string
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
      const authorization = c.req.header('authorization')
      const proxyToken = c.env.BRUTAL_TELEMETRY_PROXY_TOKEN
      const proxy = proxyToken && authorization === `Bearer ${proxyToken}`
      const stagingToken = c.env.STAGING_INGEST_TOKEN
      const staging = stagingToken && authorization === `Bearer ${stagingToken}`
      const enabled = c.env.PUBLIC_INGEST_HOST === new URL(c.req.url).host
      if (!proxy && !enabled && !staging) return c.body(null, 401)
      const proxyKey = c.req.header('x-brutal-rate-key')
      if (proxy && !/^[a-f0-9]{64}$/.test(proxyKey ?? '')) return c.body(null, 400)
      const key = proxy ? `proxy:${proxyKey}` : (c.req.header('cf-connecting-ip') ?? 'unknown')
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
