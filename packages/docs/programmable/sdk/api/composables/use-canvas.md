---
title: useCanvas
description: Attach CanvasKit-backed rendering to a canvas element for an OpenPencil editor.
---

# useCanvas

`useCanvas()` connects an editor to a real `<canvas>` element.

It handles:

- CanvasKit initialization
- surface creation
- render scheduling
- resize handling
- optional ruler visibility
- renderer readiness callback

## Usage

```ts
import { ref } from 'vue'

import { useCanvas } from '@open-pencil/vue/canvas/surface'
import { useEditor } from '@open-pencil/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor)
```

## Basic example

```vue
<script setup lang="ts">
import { ref } from 'vue'

import { useCanvas } from '@open-pencil/vue/canvas/surface'
import { useEditor } from '@open-pencil/vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const editor = useEditor()

useCanvas(canvasRef, editor, {
  showRulers: true,
  onReady: () => {
    console.log('Renderer ready')
  },
})
</script>

<template>
  <canvas ref="canvasRef" class="size-full" />
</template>
```

## Practical examples

### Disable rulers for an embedded preview

```ts
useCanvas(canvasRef, editor, {
  showRulers: false,
})
```

### Keep drawing buffer for screenshots

```ts
useCanvas(canvasRef, editor, {
  preserveDrawingBuffer: true,
})
```

## Notes

- `useCanvas()` is renderer-facing and browser-only in practice
- it is responsible for the live canvas pipeline, not app-level file flows
- it should usually be paired with `useCanvasInput()` for interaction handling
- disposal releases the renderer, Skia resources and CanvasKit handle. With `onCanvasRelease`,
  ownership of the canvas transfers to that callback so it can reuse the browser context;
  the owner must detach or dispose the element. Without the callback, disposal retains its
  existing CanvasKit handle cleanup. Canceling initialization does not report a rendering failure.

## Related APIs

- [useEditor](./use-editor)
- [useCanvasInput](./use-canvas-input)
- [useTextEdit](./use-text-edit)

## Type

```ts
interface UseCanvasOptions {
  showRulers?: boolean
  preserveDrawingBuffer?: boolean
  onReady?: () => void
  onCanvasRelease?: (canvas: HTMLCanvasElement) => void
}

function useCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  options?: UseCanvasOptions,
): void
```
