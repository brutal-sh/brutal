<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watchEffect } from 'vue'

import { acquireEditorCanvas } from '@/app/editor/canvas/surfaces'

const { layer, paneId, cursor } = defineProps<{
  layer: 'scene' | 'overlays'
  paneId?: string
  cursor?: string
}>()
const element = defineModel<HTMLCanvasElement | null>('element', { required: true })
const host = useTemplateRef<HTMLDivElement>('host')

onMounted(() => {
  if (!host.value) throw new Error('Editor canvas host is unavailable')
  const canvas = acquireEditorCanvas(layer)
  host.value.appendChild(canvas)
  element.value = canvas
})

watchEffect(() => {
  const canvas = element.value
  if (!canvas) return
  const scene = layer === 'scene'
  canvas.dataset.testId = scene ? 'scene-canvas-element' : 'canvas-element'
  if (paneId) canvas.dataset.paneId = paneId
  else delete canvas.dataset.paneId
  canvas.className = scene
    ? 'pointer-events-none absolute inset-0 size-full outline-none'
    : 'absolute inset-0 block size-full touch-none outline-none'
  canvas.style.cursor = scene ? '' : (cursor ?? '')
  if (scene) {
    canvas.setAttribute('aria-hidden', 'true')
    canvas.removeAttribute('tabindex')
  } else {
    canvas.removeAttribute('aria-hidden')
    canvas.tabIndex = -1
  }
})

onBeforeUnmount(() => {
  element.value = null
})
</script>

<template>
  <div ref="host" class="contents" />
</template>
