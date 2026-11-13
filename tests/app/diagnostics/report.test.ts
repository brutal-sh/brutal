import { beforeEach, expect, spyOn, test } from 'bun:test'

import * as v from 'valibot'

import { diagnostics } from '@/app/diagnostics'
import { recordDiagnostic } from '@/app/diagnostics/recorder'
import type { DiagnosticEvent } from '@/app/diagnostics/types'

const reportSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    environment: v.record(v.string(), v.unknown()),
    events: v.array(
      v.object({
        id: v.string(),
        attributes: v.record(v.string(), v.union([v.string(), v.number(), v.boolean(), v.null()]))
      })
    )
  })
)

beforeEach(async () => {
  await diagnostics.clear()
})

const message = '{"password":"orchid glade","session_token":"cedar17"}'
const model = 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo'
const attributes = { message, model, errorName: 'TypeError', retryable: false, errorCode: null }

test('new recorded error details are scrubbed without changing typed metadata', async () => {
  recordDiagnostic({ category: 'runtime', level: 'error', name: 'runtime.error', attributes })
  const [event] = await diagnostics.list()
  expect(event.attributes).toEqual({
    ...attributes,
    message: '{"password":"[redacted]","session_token":"[redacted]"}'
  })
  expect(attributes.message).toBe(message)
})

test('export scrubs legacy error details without mutating the source event', async () => {
  const legacy: DiagnosticEvent = {
    id: 'retained-legacy-event',
    timestamp: 1,
    category: 'runtime',
    level: 'error',
    name: 'runtime.error',
    attributes
  }
  const original = structuredClone(legacy)
  const listed = spyOn(diagnostics, 'list').mockResolvedValue([legacy])
  try {
    const text = await diagnostics.export({ app: '0.16.0', shell: 'browser' })
    const parsed = v.safeParse(reportSchema, text)
    if (!parsed.success) throw new Error(v.summarize(parsed.issues))
    const report = parsed.output
    expect(report.events).toEqual([
      {
        id: legacy.id,
        attributes: {
          ...attributes,
          message: '{"password":"[redacted]","session_token":"[redacted]"}'
        }
      }
    ])
    expect(legacy).toEqual(original)
  } finally {
    listed.mockRestore()
  }
})
