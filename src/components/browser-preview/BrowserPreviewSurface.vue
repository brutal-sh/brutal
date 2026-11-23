<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { shallowRef, type CSSProperties } from 'vue'

import type { PreviewStatus } from '@/app/browser-preview/schema'
import theme from '@/theme/browser-preview'

import BrowserPreviewHeight from './BrowserPreviewHeight.vue'
import { useBrowserHeight } from './useBrowserHeight'

const { status, preset, backdropSource, backdropStyle, disabled, prepare } = defineProps<{
  status: PreviewStatus | null
  preset: string
  backdropSource: string | null
  backdropStyle: CSSProperties
  disabled: boolean
  prepare: () => Promise<boolean>
}>()
const clipHeight = defineModel<number | null>('clipHeight', { required: true })
const error = defineModel<string>('error', { required: true })
const emit = defineEmits<{ reset: [] }>()
const region = shallowRef<HTMLElement | null>(null)
const surface = shallowRef<HTMLElement | null>(null)
const height = useBrowserHeight({
  region,
  model: clipHeight,
  error,
  prepare,
  disabled: () => disabled || !status || status.loading
})
const ui = tv(theme)()
defineExpose({
  element: surface,
  dragging: height.dragging,
  preparing: height.preparing,
  cancel: height.cancel
})
</script>

<template>
  <div ref="region" :class="ui.clipRegion()">
    <div
      ref="surface"
      data-test-id="browser-preview-surface"
      :class="ui.surface()"
      :style="status ? height.surfaceStyle.value : undefined"
    >
      <img
        v-if="backdropSource"
        :src="backdropSource"
        alt=""
        aria-hidden="true"
        :draggable="false"
        data-slot="browser-backdrop"
        :class="ui.backdrop()"
        :style="backdropStyle"
      />
      <div
        v-if="status && preset !== 'desktop'"
        aria-hidden="true"
        data-slot="browser-device-rim"
        :class="ui.deviceRim()"
        :style="backdropStyle"
      />
      <slot />
    </div>
    <BrowserPreviewHeight
      v-if="status"
      :height="height.height.value"
      :maximum="height.maximum.value"
      :minimum="height.minimum.value"
      :disabled="disabled || !!status.loading || height.preparing.value"
      :dragging="height.dragging.value"
      @start="height.start"
      @move="height.move"
      @end="height.end"
      @cancel="height.cancel"
      @key="height.key"
      @reset="emit('reset')"
    />
    <div
      v-if="status && height.clipped.value"
      aria-hidden="true"
      data-slot="browser-height-clipped"
      :class="ui.clippedSpace()"
    />
  </div>
</template>
