import { useEventListener } from '@vueuse/core'

import { refreshConnectorDrag } from '#vue/shared/input/connector/draw'
import type { DragState } from '#vue/shared/input/types'

import { cancelPointerInteraction } from './finish'
import { updateModifier } from './measurement'
import type { CanvasInputState } from './state'

const ESCAPABLE_DRAGS: ReadonlySet<DragState['type']> = new Set<DragState['type']>([
  'draw',
  'scale',
  'gradient',
  'rotate',
  'connector-draw',
  'connector-end',
  'connector-line',
  'line-end'
])

export function bindModifierKeys(s: CanvasInputState) {
  useEventListener(window, 'keydown', (event) => {
    if (s.guideInput.deleteSelected(event)) return
    updateModifier(s, event.code, true)
    refreshConnectorDrag(s.drag.value, s.lastPointer.value, event, s.options.editor)
  })
  useEventListener(window, 'keyup', (event) => {
    updateModifier(s, event.code, false)
    refreshConnectorDrag(s.drag.value, s.lastPointer.value, event, s.options.editor)
  })
}

export function bindEscape(s: CanvasInputState) {
  const { isEnabled } = s.options
  useEventListener(
    window,
    'keydown',
    (event) => {
      if (event.code !== 'Escape' || event.isComposing || !isEnabled()) return
      const type = s.drag.value?.type
      // A vector edit marquee keeps its path open through Escape.
      const swallowed = type === 'edit-marquee'
      if (!type || (!ESCAPABLE_DRAGS.has(type) && !swallowed)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!swallowed) cancelPointerInteraction(s)
    },
    { capture: true }
  )
}

function holdParentsDuringMove(s: CanvasInputState, event: KeyboardEvent, held: boolean) {
  const { isEnabled, editor } = s.options
  if (event.code !== 'Space' || s.drag.value?.type !== 'move' || !isEnabled()) return
  event.preventDefault()
  event.stopImmediatePropagation()
  s.drag.value.keepParents = held
  if (held) editor.setDropTarget(null)
}

export function bindSpaceKeys(s: CanvasInputState) {
  useEventListener(window, 'keydown', (event) => holdParentsDuringMove(s, event, true), {
    capture: true
  })
  useEventListener(window, 'keyup', (event) => holdParentsDuringMove(s, event, false), {
    capture: true
  })
}
