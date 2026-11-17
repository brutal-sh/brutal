import { describe, expect, test } from 'bun:test'

import { evaluateNumberExpression, stepNumberValue } from '#vue/controls/number-expression'

describe('absolute arithmetic entry', () => {
  test('evaluates signed numbers independently of the previous or mixed value', () => {
    for (const mixed of [false, true]) {
      for (const [expression, value] of [
        ['-10', -10],
        ['+10', 10],
        ['-(3+2)', -5]
      ] as const) {
        expect(
          evaluateNumberExpression(expression, { current: 20, mixed, expressions: 'absolute' })
        ).toEqual({ ok: true, value, kind: 'absolute' })
      }
    }
  })

  test('keeps precedence and the full arithmetic result', () => {
    for (const [expression, value] of [
      ['120*2', 240],
      ['(1440-32)/3', 1408 / 3],
      ['12.5*2', 25],
      ['2 * -(3 + 1)', -8]
    ] as const) {
      expect(
        evaluateNumberExpression(expression, { current: 20, expressions: 'absolute' })
      ).toEqual({ ok: true, value, kind: 'absolute' })
    }
  })

  test('rejects incomplete expressions, relative-only operators and executable input', () => {
    for (const expression of ['1+', '*2', '/4', 'constructor', 'Math.max(1,2)', '[1]', '1;2']) {
      expect(
        evaluateNumberExpression(expression, { current: 20, expressions: 'absolute' })
      ).toEqual({ ok: false, error: 'syntax' })
    }
    for (const expression of ['1/0', '1e999', '-1e999']) {
      expect(
        evaluateNumberExpression(expression, { current: 20, expressions: 'absolute' })
      ).toEqual({ ok: false, error: 'non-finite' })
    }
  })

  test('retains percentage evaluation and the legacy boolean modes', () => {
    expect(
      evaluateNumberExpression('(25+25)%', { current: 20, max: 80, expressions: 'absolute' })
    ).toEqual({ ok: true, value: 40, kind: 'percent' })
    expect(evaluateNumberExpression('-4', { current: 20, expressions: true })).toEqual({
      ok: true,
      value: 16,
      kind: 'relative'
    })
    expect(evaluateNumberExpression('12+2', { current: 20, expressions: false })).toEqual({
      ok: true,
      value: 12,
      kind: 'absolute'
    })
  })

  test('preserves the public positional step call and runtime arity', () => {
    expect(stepNumberValue.length).toBe(3)
    expect(stepNumberValue(9, 1, 2, {}, 0, 10)).toBe(10)
    expect(stepNumberValue(10, -1, 2, { shiftKey: true }, -15, 15)).toBe(-10)
  })
})
