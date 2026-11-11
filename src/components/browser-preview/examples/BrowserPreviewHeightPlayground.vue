<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, useTemplateRef } from 'vue'

import type { PreviewStatus } from '@/app/browser-preview/schema'
import BrowserPreviewSurface from '@/components/browser-preview/BrowserPreviewSurface.vue'
import { useBrowserSurface } from '@/components/browser-preview/useBrowserSurface'
import { useBrowserViewport } from '@/components/browser-preview/useBrowserViewport'
import AppButton from '@/components/ui/button/AppButton.vue'

const { preset = 'desktop', manual = false } = defineProps<{ preset?: string; manual?: boolean }>()
const snapshotCanvas = useTemplateRef<HTMLCanvasElement>('snapshotCanvas')
const height = ref<number | null>(null)
const error = ref('')
const heightResets = ref(0)
let nextRequest = 0
interface Request {
  id: number
  resolve: (ready: boolean) => void
  reject: (error: Error) => void
}
const requests = shallowRef<Request[]>([])
const status = shallowRef<PreviewStatus | null>({
  url: 'https://example.test/',
  title: 'Height fixture',
  width: 1280,
  height: 800,
  captureAvailable: true,
  loading: false
})
function prepareFrame() {
  if (!manual) return Promise.resolve(true)
  return new Promise<boolean>((resolve, reject) => {
    requests.value = [...requests.value, { id: ++nextRequest, resolve, reject }]
  })
}
const surfaceView = useTemplateRef<InstanceType<typeof BrowserPreviewSurface>>('surfaceView')
const surface = computed(() => surfaceView.value?.element ?? null)
const dragging = computed(() => surfaceView.value?.dragging ?? false)
const preparingDrag = computed(() => surfaceView.value?.preparing ?? false)
const nativeVisible = ref(true)
const open = ref(true)
const viewport = useBrowserViewport({ surface, open, preset: computed(() => preset), zoom: ref(1) })
const frame = useBrowserSurface({
  bridge: {
    native: { backdrop: captureFrame },
    syncBounds: async () => {
      nativeVisible.value = open.value && !dragging.value
    }
  },
  surface,
  open,
  preset: computed(() => preset),
  zoom: ref(1),
  status,
  error,
  dragging,
  preparingDrag,
  viewport: viewport.surfaceViewport
})
async function captureFrame() {
  const bounds = viewport.surfaceViewport()?.bounds
  if (!bounds) throw new Error('The fixture viewport is unavailable.')
  const ready = await prepareFrame()
  if (!ready && status.value)
    status.value = { ...status.value, url: `${status.value.url}#replaced` }
  const canvas = snapshotCanvas.value
  if (!canvas) throw new Error('The fixture canvas is unavailable.')
  canvas.width = Math.max(1, Math.round(bounds.width))
  canvas.height = Math.max(1, Math.round(bounds.height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The fixture canvas is unavailable.')
  context.fillStyle = '#6b5cff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#e4e4e7'
  context.fillRect(0, canvas.height / 3, canvas.width, canvas.height / 3)
  const image = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The fixture frame could not be encoded.'))
    })
  })
  return new Uint8Array(await image.arrayBuffer())
}
function settle(request: Request, action: 'ready' | 'refuse' | 'fail') {
  requests.value = requests.value.filter((item) => item !== request)
  if (action === 'fail') request.reject(new Error('Fixture backdrop failed.'))
  else request.resolve(action === 'ready')
}
function resetHeight() {
  height.value = null
  heightResets.value++
}
onScopeDispose(() => {
  frame.disposeSurface()
  for (const request of requests.value) request.resolve(false)
})
</script>

<template>
  <div class="w-96 space-y-2">
    <canvas ref="snapshotCanvas" hidden aria-hidden="true" />
    <div class="flex h-[500px] flex-col overflow-hidden rounded-lg border border-border">
      <BrowserPreviewSurface
        ref="surfaceView"
        v-model:clip-height="height"
        v-model:error="error"
        :status="status"
        :preset="preset"
        :backdrop-source="frame.backdrop.src.value"
        :backdrop-style="frame.backdropStyle.value"
        :disabled="false"
        :prepare="frame.prepareDragBackdrop"
        @reset="resetHeight"
      >
        <div class="flex h-full flex-col justify-between p-4 text-sm">
          <p>Browser page fixture</p>
          <p>Editable content continues below the import edge.</p>
        </div>
      </BrowserPreviewSurface>
    </div>
    <output aria-label="Import height" class="block text-sm">{{ height ?? 'Full page' }}</output>
    <output aria-label="Native surface" class="block text-sm">{{
      nativeVisible ? 'visible' : 'hidden'
    }}</output>
    <output aria-label="Height resets" class="block text-sm">{{ heightResets }}</output>
    <output aria-label="Backdrop capture" class="block text-sm">{{
      frame.backdrop.pending.value ? 'pending' : 'idle'
    }}</output>
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }}</p>
    <div v-for="request in requests" :key="request.id" class="flex gap-2">
      <AppButton size="sm" variant="outline" @click="settle(request, 'ready')"
        >Ready {{ request.id }}</AppButton
      >
      <AppButton size="sm" variant="outline" @click="settle(request, 'refuse')"
        >Refuse {{ request.id }}</AppButton
      >
      <AppButton size="sm" variant="outline" @click="settle(request, 'fail')"
        >Fail {{ request.id }}</AppButton
      >
    </div>
  </div>
</template>
