import { expect, test } from 'bun:test'

import type { Ref } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'

import { useCanvasInput } from '#vue/canvas/useCanvasInput'

type TitleHitTest = (cx: number, cy: number) => SceneNode | null
type LegacyArguments = [
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  section: TitleHitTest,
  component: TitleHitTest,
  frame: TitleHitTest,
  cursor?: (cx: number, cy: number) => void,
  activate?: () => void,
  enabled?: () => boolean,
  zoomSpeed?: () => number
]

const legacyCall: (...args: LegacyArguments) => ReturnType<typeof useCanvasInput> = useCanvasInput

test('keeps the positional canvas SDK callable and its public function metadata', () => {
  expect(legacyCall).toBe(useCanvasInput)
  expect(useCanvasInput.name).toBe('useCanvasInput')
  expect(Reflect.ownKeys(useCanvasInput)).toEqual(['length', 'name', 'prototype'])
  expect(Object.getOwnPropertyDescriptor(useCanvasInput, 'length')).toEqual({
    value: 7,
    writable: false,
    enumerable: false,
    configurable: true
  })
})
