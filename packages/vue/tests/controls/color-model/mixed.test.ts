import { expect, test } from 'bun:test'

import { ref } from 'vue'

import { parseColor } from '@open-pencil/scene-graph/color'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useColorModel } from '@open-pencil/vue/controls/color-model'

test('explicit first-color input unifies mixed colors while ordinary no-ops stay silent', () => {
  const color = parseColor('#FEE484')
  const mixed = ref(true)
  const updates: Color[] = []
  const model = useColorModel({ color, mixed, onUpdate: (value) => updates.push(value) })
  model.updateHex('FEE484')
  expect(updates).toEqual([color])
  mixed.value = false
  model.updateHex('FEE484')
  expect(updates).toEqual([color])
})
