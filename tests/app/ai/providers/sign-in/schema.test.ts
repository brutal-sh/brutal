import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { loopbackOutcomeSchema } from '@/app/ai/providers/sign-in/schema'

describe('native OAuth loopback outcome', () => {
  test('retains the code or native terminal result', () => {
    for (const outcome of [
      { kind: 'code', code: 'fixture-code' },
      { kind: 'denied' },
      { kind: 'expired' },
      { kind: 'cancelled' }
    ] as const) {
      expect(v.parse(loopbackOutcomeSchema, outcome)).toEqual(outcome)
    }
  })

  test('rejects missing or malformed codes and non-native outcome kinds', () => {
    for (const outcome of [
      null,
      {},
      { kind: 'code' },
      { kind: 'code', code: 7 },
      { kind: 'mismatch' }
    ]) {
      expect(v.safeParse(loopbackOutcomeSchema, outcome).success).toBe(false)
    }
  })
})
