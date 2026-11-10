import { strict as assert } from 'node:assert'

import * as v from 'valibot'

const handlesSchema = v.object({ value: v.array(v.string()) })
const handleSchema = v.object({ value: v.string() })
const emptySchema = v.object({ value: v.null() })
const elementSchema = v.object({
  value: v.object({ 'element-6066-11e4-a52e-4f735466cecf': v.string() })
})
const enabledSchema = v.object({ value: v.boolean() })
const errorSchema = v.object({ value: v.object({ error: v.string() }) })

async function request<T>(
  path: string,
  schema: v.GenericSchema<unknown, T>,
  options: { method?: 'POST' | 'DELETE'; body?: Record<string, unknown>; status?: number } = {}
): Promise<T> {
  const { hostname, port } = browser.options
  assert.ok(hostname === '127.0.0.1' || hostname === 'localhost')
  assert.ok(port && browser.sessionId)
  const response = await fetch(`http://${hostname}:${port}/session/${browser.sessionId}${path}`, {
    method: options.method,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  assert.equal(response.status, options.status ?? 200, `Native driver status for ${path}`)
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), schema), await response.text())
  if (!parsed.success) throw new Error(`Invalid native driver response for ${path}`)
  return parsed.output
}

// Raw protocol reads avoid the service's automatic focus recovery after an intentional close.
export async function readNativeDriverHandles(): Promise<string[]> {
  return (await request('/window/handles', handlesSchema)).value
}

export async function readNativeDriverHandle(): Promise<string> {
  return (await request('/window', handleSchema)).value
}

export async function readNativeDriverCanvasEnabled(): Promise<boolean> {
  const element = await request('/element', elementSchema, {
    method: 'POST',
    body: { using: 'css selector', value: 'canvas' }
  })
  const id = encodeURIComponent(element.value['element-6066-11e4-a52e-4f735466cecf'])
  return (await request(`/element/${id}/enabled`, enabledSchema)).value
}

export async function refuseNativeDriverWindow(label: string): Promise<string> {
  return (
    await request('/window', errorSchema, { method: 'POST', body: { handle: label }, status: 404 })
  ).value.error
}

export async function switchNativeDriverWindow(label: string): Promise<void> {
  await request('/window', emptySchema, { method: 'POST', body: { handle: label } })
}

export async function closeNativeDriverWindow(): Promise<void> {
  await request('/window', handlesSchema, { method: 'DELETE' })
}

export async function readClosedNativeDriverError(): Promise<string> {
  return (await request('/window', errorSchema, { status: 404 })).value.error
}
