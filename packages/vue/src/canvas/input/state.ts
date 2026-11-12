import { ref, watch, type Ref } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'

import { createAutoLayoutValueEdit } from '#vue/canvas/auto-layout/value-edit'
import { createGuideInput } from '#vue/canvas/guides/input'
import { createCanvasLabelEdit } from '#vue/canvas/labels/edit'
import { createCanvasPointer } from '#vue/canvas/pointer/use'
import { createTextEditInput } from '#vue/canvas/text-edit/input'
import { createCanvasTransformInput } from '#vue/canvas/transform/input'
import { createClickCounter } from '#vue/shared/input/click-count'
import { useSpaceHeld } from '#vue/shared/input/space-key'
import type { DragState } from '#vue/shared/input/types'

type TitleHitTest = (cx: number, cy: number) => SceneNode | null

export type CanvasInputOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>
  editor: Editor
  hitTestSectionTitle: TitleHitTest
  hitTestComponentLabel: TitleHitTest
  hitTestFrameTitle: TitleHitTest
  onCursorMove?: (cx: number, cy: number) => void
  onActivate?: () => void
  isEnabled: () => boolean
  zoomSpeed: () => number
}

export type InputCoordinates = ReturnType<ReturnType<typeof createCanvasPointer>['getCoords']>
export type BaseInputState = ReturnType<typeof createBaseInputState>
export type CanvasInputState = ReturnType<typeof createCanvasInputState>

function createDragState(editor: Editor) {
  const drag = ref<DragState | null>(null)
  watch(
    () => drag.value?.type,
    (type) =>
      editor.setTransforming(
        type === 'move' || type === 'resize' || type === 'rotate' || type === 'scale'
      )
  )
  return drag
}

function createBaseInputState(options: CanvasInputOptions) {
  const drag = createDragState(options.editor)
  const canvasLabelEdit = createCanvasLabelEdit(options.editor)
  const cursorOverride = ref<string | null>(null)
  const valueEdit = createAutoLayoutValueEdit(options.editor)
  return {
    options,
    drag,
    canvasLabelEdit,
    cursorOverride,
    valueEdit,
    selectedIdsBeforeClickSequence: ref<ReadonlySet<string>>(new Set()),
    lastPointer: ref<InputCoordinates | null>(null),
    pointerInside: ref(false),
    modifiers: { altHeld: false, metaHeld: false, controlHeld: false },
    spaceHeld: useSpaceHeld(),
    clicks: createClickCounter(),
    pointer: createCanvasPointer(
      options.canvasRef,
      options.editor,
      options.hitTestSectionTitle,
      options.hitTestComponentLabel,
      options.hitTestFrameTitle
    )
  }
}

export function setInputDrag(state: BaseInputState, drag: DragState) {
  state.options.editor.setMeasurementMode('off')
  state.drag.value = drag
}

function createGuides(state: BaseInputState) {
  return createGuideInput({
    canvasRef: state.options.canvasRef,
    editor: state.options.editor,
    canvasToLocal: state.pointer.canvasToLocal,
    setDrag: (drag) => setInputDrag(state, drag),
    setCursor: (cursor) => {
      state.cursorOverride.value = cursor
    }
  })
}

function createTextInput(state: BaseInputState) {
  return createTextEditInput({
    editor: state.options.editor,
    getCoords: state.pointer.getCoords,
    hitTestInScope: state.pointer.hitTestInScope,
    hitTestSectionTitle: state.options.hitTestSectionTitle,
    hitTestComponentLabel: state.options.hitTestComponentLabel,
    hitTestFrameTitle: state.options.hitTestFrameTitle,
    getClickCount: state.clicks.getClickCount,
    wasSelectedBeforeClickSequence: (id) => state.selectedIdsBeforeClickSequence.value.has(id),
    onEditCanvasLabel: state.canvasLabelEdit.start,
    setDrag: (drag) => setInputDrag(state, drag)
  })
}

export function createCanvasInputState(options: CanvasInputOptions) {
  const base = createBaseInputState(options)
  const guideInput = createGuides(base)
  const textInput = createTextInput(base)
  const transformInput = createCanvasTransformInput(options.editor, (drag) =>
    setInputDrag(base, drag)
  )
  return { ...base, guideInput, textInput, transformInput }
}
