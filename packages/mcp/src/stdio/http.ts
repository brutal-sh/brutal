import { request, type ClientRequest, type RequestOptions } from 'node:http'

import * as v from 'valibot'

const responseSchema = v.pipe(v.string(), v.parseJson(), v.unknown())
const SOCKET_TIMEOUT = 30_000

/** Abort closes only this request; already committed editor effects cannot be rolled back. */
export function sendHTTP(
  options: RequestOptions,
  body?: Record<string, unknown>
): Promise<{ status: number; data: unknown; req: ClientRequest }> {
  return new Promise((resolve, reject) => {
    const req = request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8')
        const parsed = v.safeParse(responseSchema, raw)
        resolve({ status: res.statusCode ?? 200, data: parsed.success ? parsed.output : raw, req })
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(SOCKET_TIMEOUT, () => req.destroy(new Error('Socket timeout')))
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

const errorSchema = v.object({ error: v.optional(v.string()) })

export function rpcHTTPError(status: number, data: unknown) {
  const parsed = v.safeParse(errorSchema, data)
  return new Error(
    parsed.success && parsed.output.error ? parsed.output.error : `RPC failed with status ${status}`
  )
}
