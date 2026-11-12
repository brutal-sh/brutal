import { expect, test } from 'bun:test'

import { ref } from 'vue'

import { createEditor } from '@open-pencil/core'

import { cancelPointerInteraction } from '#vue/canvas/input/finish'
import { updateModifier } from '#vue/canvas/input/measurement'
import type { CanvasInputState } from '#vue/canvas/input/state'
import type { DragState } from '#vue/shared/input/types'

import { asDouble } from '#tests/helpers/doubles'

test('clears a cancelled drag before a preview callback cancels again', () => {
  const editor = createEditor()
  let cancels = 0
  const drag = ref<DragState | null>(null)
  const cursorOverride = ref<string | null>('crosshair')
  const state = asDouble<CanvasInputState>({
    options: { editor },
    drag,
    cursorOverride,
    guideInput: { clearHoverAndPreview: () => undefined }
  })
  drag.value = {
    type: 'shape-handle',
    update: () => undefined,
    commit: () => undefined,
    cancel: () => {
      cancels++
      cancelPointerInteraction(state)
    }
  }
  try {
    cancelPointerInteraction(state)
    cancelPointerInteraction(state)
    expect(cancels).toBe(1)
    expect(drag.value).toBeNull()
    expect(cursorOverride.value).toBeNull()
  } finally {
    editor.dispose()
  }
})

test('calls the SDK enablement callback without an options-object receiver', () => {
  let called = false
  const state = asDouble<CanvasInputState>({
    options: {
      isEnabled: function (this: unknown) {
        called = true
        expect(this).toBeUndefined()
        return true
      }
    },
    modifiers: { altHeld: false, metaHeld: false, controlHeld: false }
  })
  updateModifier(state, 'KeyA', true)
  expect(called).toBe(true)
})
