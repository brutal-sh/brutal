import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

const DESKTOP_ORIGIN = 'tauri://localhost'
const MAX_BYTES = 4096

function reply(status) {
  return new Response(null, {
    status,
    headers: {
      'Access-Control-Allow-Origin': DESKTOP_ORIGIN,
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    }
  })
}

export function OPTIONS(request) {
  return reply(request.headers.get('origin') === DESKTOP_ORIGIN ? 204 : 403)
}

async function readBatch(request) {
  const reader = request.body?.getReader()
  if (!reader) return null
  const buffer = new Uint8Array(MAX_BYTES)
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) return buffer.subarray(0, size)
      if (value.length > buffer.length - size) {
        await reader.cancel()
        return null
      }
      buffer.set(value, size)
      size += value.length
    }
  } finally {
    reader.releaseLock()
  }
}

export async function POST(request) {
  if (request.headers.get('origin') !== DESKTOP_ORIGIN) return reply(403)
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim() !== 'application/json') {
    return reply(415)
  }
  const secret = process.env.BRUTAL_TELEMETRY_PROXY_TOKEN
  const receiver = process.env.BRUTAL_TELEMETRY_RECEIVER
  if (!secret || !receiver) return reply(503)
  const clientIP = request.headers.get('x-vercel-forwarded-for')?.trim() ?? ''
  if (!isIP(clientIP)) return reply(403)
  try {
    const batch = await readBatch(request)
    if (!batch) return reply(413)
    const rateKey = createHmac('sha256', secret).update(clientIP).digest('hex')
    const response = await fetch(receiver, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        'X-Brutal-Rate-Key': rateKey
      },
      body: batch,
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    })
    return reply([204, 400, 413, 429].includes(response.status) ? response.status : 502)
  } catch {
    return reply(502)
  }
}
