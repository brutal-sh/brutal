<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, nextTick, onMounted, onScopeDispose, ref, useTemplateRef, watch } from 'vue'

import type { BrowserCaptureScope } from '@/app/browser-preview/capture'
import { confirmBrowserSiteClear } from '@/app/browser-preview/clear'
import type { BrowserPreviewSession } from '@/app/browser-preview/context'
import { createBrowserPreviewController } from '@/app/browser-preview/controller'
import { hasPreviewOverlay } from '@/app/browser-preview/dock'
import { browserImportTarget } from '@/app/browser-preview/dom/placement'
import { browserHistoryError } from '@/app/browser-preview/history/storage'
import {
  createBrowserPreviewNative,
  openBrowserExportExternally
} from '@/app/browser-preview/native'
import { browserCaptureTarget } from '@/app/browser-preview/placement'
import { browserViewportPreferenceError } from '@/app/browser-preview/preferences'
import { useEditorStore } from '@/app/editor/active-store'
import { openExternalLink } from '@/app/shell/ui'
import theme from '@/theme/browser-preview'

import BrowserPreviewLanding from './BrowserPreviewLanding.vue'
import BrowserPreviewSurface from './BrowserPreviewSurface.vue'
import BrowserPreviewToolbar from './BrowserPreviewToolbar.vue'
import BrowserPreviewPickerBreadcrumbs from './picker/BrowserPreviewPickerBreadcrumbs.vue'
import BrowserPreviewPickerStyles from './picker/BrowserPreviewPickerStyles.vue'
import { provideBrowserPicker } from './picker/use'
import { useBrowserFeedback } from './useBrowserFeedback'
import { useBrowserHistory } from './useBrowserHistory'
import { useBrowserSurface } from './useBrowserSurface'
import { useBrowserViewport, useBrowserViewportSession } from './useBrowserViewport'

const open = defineModel<boolean>('open', { default: false })
const codingMode = defineModel<boolean>('codingMode', { default: false })
const { session } = defineProps<{ session: BrowserPreviewSession }>()
const store = useEditorStore()
const surfaceView = useTemplateRef<InstanceType<typeof BrowserPreviewSurface>>('surfaceView')
const surface = computed(() => surfaceView.value?.element ?? null)
const heightDragging = computed(() => surfaceView.value?.dragging ?? false)
const heightPreparing = computed(() => surfaceView.value?.preparing ?? false)
const clipHeight = ref<number | null>(session.clipHeight ?? null)
const toolbar = useTemplateRef<InstanceType<typeof BrowserPreviewToolbar>>('toolbar')
const ui = tv(theme)()
function focusAddress() {
  toolbar.value?.focusAddress()
}
async function navigate() {
  if (!address.value.trim()) return
  await preview.navigate()
}
let disposed = false
let clearingPage = false
const zoom = ref(session.zoom)
const allowedExport = (url: string) => (session.exportURLs.has(url) ? url : undefined)
const bridge = createBrowserPreviewNative(
  () => (hasPreviewOverlay() || heightDragging.value ? null : viewport.surfaceViewport()),
  undefined,
  allowedExport
)
const preview = createBrowserPreviewController(
  bridge.native,
  () => browserCaptureTarget(store),
  () => browserImportTarget(store, () => open.value),
  allowedExport
)
const { address, preset, status, busy: actionBusy, error, notice } = preview
const viewport = useBrowserViewport({ surface, open, preset, zoom })
const { selectedDevice, nextDevice, setZoom, cycleDevice } = viewport
const {
  backdrop,
  backdropStyle,
  syncSurface,
  prepareBackdrop,
  prepareDragBackdrop,
  disposeSurface
} = useBrowserSurface({
  bridge,
  surface,
  open,
  preset,
  zoom,
  status,
  error,
  dragging: heightDragging,
  preparingDrag: heightPreparing,
  viewport: viewport.surfaceViewport
})
const { openingHistory, openSuggestion } = useBrowserHistory({
  session,
  preview,
  isCurrent: () => !disposed && open.value,
  busy: () => busy.value
})
const busy = computed(
  () =>
    actionBusy.value ||
    backdrop.pending.value ||
    openingHistory.value ||
    heightPreparing.value ||
    heightDragging.value
)
watch([clipHeight, heightDragging, heightPreparing], () => {
  if (!heightDragging.value && !heightPreparing.value) session.clipHeight = clipHeight.value
})
watch([clipHeight, heightDragging], syncSurface, { flush: 'post' })
watch([open, codingMode], () => surfaceView.value?.cancel())
defineExpose({
  async openPage(url: string) {
    if (busy.value) throw new Error('Wait for the browser operation to finish, then export again.')
    address.value = url
    await navigate()
  }
})
const picker = provideBrowserPicker(
  bridge.picker,
  () => status.value?.url ?? '',
  () => busy.value || !status.value || status.value.loading,
  (action) => {
    void (action === 'import' ? importPage() : capture())
  }
)
useBrowserFeedback({
  error: () =>
    error.value ||
    picker.error.value ||
    browserHistoryError.value ||
    browserViewportPreferenceError.value,
  notice,
  captureAvailable: () => status.value?.captureAvailable
})
async function importPage() {
  if (busy.value) return
  const limit = clipHeight.value === null ? undefined : viewport.surfaceViewport()?.viewport.height
  await preview.importPage(!!picker.state.value?.pick, limit)
  if (notice.value && picker.state.value?.pick) await picker.stop()
}
async function importFullPage() {
  if (busy.value || store.state.readOnly) return
  clipHeight.value = null
  await nextTick()
  syncSurface()
  await preview.importPage(false)
  if (notice.value && picker.state.value?.pick) await picker.stop()
}
async function capture(scope?: BrowserCaptureScope) {
  if (busy.value) return
  await preview.capture(scope ?? (picker.state.value?.pick ? 'selected' : 'visible'))
  if (notice.value && picker.state.value?.pick) await picker.stop()
}
async function clearSiteData() {
  const url = status.value?.url
  if (!url || busy.value) return
  try {
    if ((await confirmBrowserSiteClear(url)) && !disposed && open.value) {
      backdrop.clear()
      await preview.clearSiteData(url)
    }
  } catch (reason) {
    if (!disposed) error.value = reason instanceof Error ? reason.message : String(reason)
  }
}
async function openExternal(folder = false) {
  const url = status.value?.url
  if (!url) return
  try {
    if (url.startsWith('file:')) await openBrowserExportExternally(url, folder)
    else if (!folder) await openExternalLink(url)
  } catch (reason) {
    if (!disposed) error.value = reason instanceof Error ? reason.message : String(reason)
  }
}
watch(
  () => status.value?.loading,
  (loading) => {
    if (loading) picker.reset()
    if (loading) backdrop.clear()
  }
)
async function closePage() {
  clearingPage = true
  await preview.clearPage()
  if (!status.value && !error.value) session.url = ''
  clearingPage = false
}
useBrowserViewportSession(session, preset, zoom, () => {
  backdrop.clear()
  syncSurface()
})
const { pause, resume } = useIntervalFn(preview.refresh, 1000, {
  immediate: false
})

watch(
  open,
  (visible) => {
    if (visible) resume()
    else {
      pause()
      backdrop.clear()
    }
    syncSurface()
  },
  { immediate: true }
)
watch(status, syncSurface)
watch(
  codingMode,
  async (expanded) => {
    await nextTick()
    if (disposed) return
    syncSurface()
    if (!expanded) return
    if (status.value) await preview.action('focus')
    else focusAddress()
  },
  { immediate: true }
)
watch(
  () => status.value?.url,
  () => backdrop.clear()
)
onMounted(async () => {
  syncSurface()
  await session.closing
  if (disposed || !session.url) return
  address.value = session.url
  await navigate()
  if (!disposed && codingMode.value && status.value) await preview.action('focus')
})
onScopeDispose(() => {
  disposed = true
  disposeSurface()
  preview.dispose()
  session.url = clearingPage ? '' : (status.value?.url ?? session.url)
  session.closing = bridge
    .dispose()
    .then((snapshot) => {
      if (snapshot) session.url = snapshot.url
      return undefined
    })
    .catch((reason: unknown) =>
      console.warn('[Browser preview] Could not retain or close page', reason)
    )
})
</script>

<template>
  <section
    v-show="open"
    aria-label="Browser preview"
    data-test-id="browser-preview-dock"
    data-editor-input-surface
    :class="ui.root()"
  >
    <BrowserPreviewToolbar
      ref="toolbar"
      v-model:address="address"
      v-model:coding-mode="codingMode"
      :busy="busy"
      :status="status"
      :device="selectedDevice"
      :next-device="nextDevice"
      :selected="!!picker.state.value?.pick"
      :read-only="store.state.readOnly"
      :zoom="zoom"
      :prepare="prepareBackdrop"
      @navigate="navigate"
      @suggestion="openSuggestion"
      @action="preview.action"
      @external="openExternal"
      @cycle="cycleDevice"
      @clear-page="closePage"
      @import="importPage"
      @capture="capture"
      @zoom="setZoom"
      @clear="clearSiteData"
      @close="open = false"
    />
    <BrowserPreviewPickerBreadcrumbs />
    <BrowserPreviewSurface
      ref="surfaceView"
      v-model:clip-height="clipHeight"
      v-model:error="error"
      :status="status"
      :preset="preset"
      :backdrop-source="backdrop.src.value"
      :backdrop-style="backdropStyle"
      :disabled="actionBusy || openingHistory || !open"
      :prepare="prepareDragBackdrop"
      @full="importFullPage"
    >
      <BrowserPreviewLanding
        v-if="!status"
        :busy="busy"
        @navigate="openSuggestion"
        @focus-address="focusAddress"
      />
    </BrowserPreviewSurface>
    <span v-if="status" class="sr-only" aria-live="polite"
      >{{ status.width }} × {{ status.height }}</span
    >
    <BrowserPreviewPickerStyles />
  </section>
</template>
