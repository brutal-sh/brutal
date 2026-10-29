<script setup lang="ts">
import {
  useIntervalFn,
  useResizeObserver,
  useEventListener,
  useMutationObserver
} from '@vueuse/core'
import { onMounted, onScopeDispose, ref, useId, watch } from 'vue'

import { createBrowserPreviewController } from '@/app/browser-preview/controller'
import { hasPreviewOverlay, previewDockBounds } from '@/app/browser-preview/dock'
import { createBrowserPreviewNative } from '@/app/browser-preview/native'
import { browserCaptureTarget } from '@/app/browser-preview/placement'
import { useEditorStore } from '@/app/editor/active-store'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'

const open = defineModel<boolean>('open', { default: false })
const store = useEditorStore()
const surface = ref<HTMLElement | null>(null)
const inputId = useId()
let frame = 0
let lastLayout = ''
let disposed = false
const bridge = createBrowserPreviewNative(() => {
  if (!open.value || !surface.value || hasPreviewOverlay()) return null
  const rect = surface.value.getBoundingClientRect()
  return previewDockBounds(
    rect,
    preset.value as 'desktop' | 'tablet' | 'phone',
    window.innerWidth,
    window.innerHeight
  )
})
const preview = createBrowserPreviewController(bridge.native, () => browserCaptureTarget(store))
const { address, preset, status, busy, error, notice } = preview
const { pause, resume } = useIntervalFn(preview.refresh, 1000, { immediate: false })

function syncSurface() {
  if (frame || disposed) return
  frame = requestAnimationFrame(() => {
    frame = 0
    const rect = surface.value?.getBoundingClientRect()
    const overlay = !!hasPreviewOverlay()
    const key = JSON.stringify([
      rect?.x,
      rect?.y,
      rect?.width,
      rect?.height,
      preset.value,
      status.value?.url,
      overlay,
      open.value
    ])
    if (key === lastLayout) return
    lastLayout = key
    void bridge.syncBounds().catch((reason: unknown) => {
      lastLayout = ''
      if (!disposed) error.value = String(reason)
    })
  })
}
watch(
  open,
  (visible) => {
    if (visible) resume()
    else pause()
    syncSurface()
  },
  { immediate: true }
)
watch([preset, status], syncSurface)
watch(
  () => status.value?.url,
  (url) => {
    if (url && document.activeElement?.id !== inputId) address.value = url
  }
)
useResizeObserver(surface, syncSurface)
useEventListener(window, 'resize', syncSurface)
useMutationObserver(document.body, syncSurface, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['data-state']
})
onMounted(syncSurface)
onScopeDispose(() => {
  disposed = true
  if (frame) cancelAnimationFrame(frame)
  preview.dispose()
  void bridge
    .dispose()
    .catch((reason: unknown) => console.warn('[Browser preview] Close failed', reason))
})
</script>

<template>
  <section
    v-show="open"
    aria-label="Browser preview"
    data-test-id="browser-preview-dock"
    class="flex min-h-0 min-w-0 flex-1 flex-col bg-panel"
  >
    <div class="flex items-center gap-1 border-b border-border px-3 py-2">
      <span class="flex-1 text-xs font-medium">Browser</span>
      <IconButton label="Close browser preview" @click="open = false"
        ><icon-lucide-x class="size-3.5"
      /></IconButton>
    </div>
    <form
      class="flex items-center gap-1 border-b border-border p-2"
      @submit.prevent="preview.navigate"
    >
      <label :for="inputId" class="sr-only">Web address</label>
      <AppInput
        :id="inputId"
        v-model="address"
        type="url"
        placeholder="https://example.com"
        class="min-w-0 flex-1"
        :disabled="busy"
      />
      <AppButton type="submit" size="xs" :disabled="busy || !address.trim()">Go</AppButton>
    </form>
    <div class="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1">
      <IconButton label="Back" :disabled="busy || !status" @click="preview.action('back')"
        ><icon-lucide-arrow-left class="size-3.5"
      /></IconButton>
      <IconButton label="Forward" :disabled="busy || !status" @click="preview.action('forward')"
        ><icon-lucide-arrow-right class="size-3.5"
      /></IconButton>
      <IconButton label="Reload page" :disabled="busy || !status" @click="preview.action('reload')"
        ><icon-lucide-rotate-cw class="size-3.5"
      /></IconButton>
      <span class="flex-1" />
      <IconButton
        label="Desktop"
        :aria-pressed="preset === 'desktop'"
        :disabled="busy"
        @click="preset = 'desktop'"
        ><icon-lucide-monitor class="size-3.5"
      /></IconButton>
      <IconButton
        label="Phone"
        :aria-pressed="preset === 'phone'"
        :disabled="busy"
        @click="preset = 'phone'"
        ><icon-lucide-smartphone class="size-3.5"
      /></IconButton>
      <IconButton
        label="Capture into this design"
        :disabled="busy || !status?.captureAvailable || store.state.readOnly"
        @click="preview.capture"
        ><icon-lucide-camera class="size-3.5"
      /></IconButton>
    </div>
    <div
      v-if="error || notice || (status && !status.captureAvailable)"
      class="p-2"
      aria-live="polite"
    >
      <AppAlert v-if="error" tone="error" heading="Browser action failed" :description="error" />
      <AppAlert v-else-if="notice" tone="success" heading="Capture added" :description="notice" />
      <AppAlert
        v-else
        heading="Capture requires macOS"
        description="Navigation is available on this platform."
      />
    </div>
    <div
      ref="surface"
      data-test-id="browser-preview-surface"
      class="relative min-h-0 flex-1 overflow-hidden bg-canvas"
    >
      <p v-if="!status" class="p-4 text-xs text-muted">Enter a web address to preview it here.</p>
    </div>
    <div class="flex items-center gap-2 border-t border-border px-3 py-1 text-xs text-muted">
      <span class="min-w-0 flex-1 truncate">Capture to {{ store.state.documentName }}</span>
      <span v-if="status">{{ status.width }} × {{ status.height }}</span>
    </div>
  </section>
</template>
