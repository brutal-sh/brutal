<script setup lang="ts">
import {
  useIntervalFn,
  useResizeObserver,
  useEventListener,
  useMutationObserver
} from '@vueuse/core'
import { tv } from 'tailwind-variants'
import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
  type CSSProperties
} from 'vue'

import { createBrowserBackdrop } from '@/app/browser-preview/backdrop'
import type { BrowserCaptureScope } from '@/app/browser-preview/capture'
import { confirmBrowserSiteClear } from '@/app/browser-preview/clear'
import type { BrowserPreviewSession } from '@/app/browser-preview/context'
import { createBrowserPreviewController } from '@/app/browser-preview/controller'
import {
  hasPreviewOverlay,
  hasUnpreparedPreviewOverlay,
  previewDockViewport
} from '@/app/browser-preview/dock'
import { browserImportTarget } from '@/app/browser-preview/dom/placement'
import { completedBrowserVisitSchema } from '@/app/browser-preview/history/schema'
import {
  browserHistory,
  browserHistoryError,
  updatingBrowserHistory,
  rememberBrowserVisit,
  removeBrowserVisit,
  clearBrowserHistory
} from '@/app/browser-preview/history/storage'
import {
  createBrowserPreviewNative,
  openBrowserExportExternally
} from '@/app/browser-preview/native'
import { browserCaptureTarget } from '@/app/browser-preview/placement'
import {
  browserViewportPreferences,
  browserViewportPreferenceError,
  saveBrowserViewport
} from '@/app/browser-preview/preferences'
import { PREVIEW_PRESETS, previewAddressLabel } from '@/app/browser-preview/schema'
import { useEditorStore } from '@/app/editor/active-store'
import { openExternalLink, toast } from '@/app/shell/ui'
import { bindDesktopLinkQueue } from '@/app/tauri/link-queue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import theme from '@/theme/browser-preview'

import BrowserPreviewCapture from './BrowserPreviewCapture.vue'
import BrowserPreviewHistory from './BrowserPreviewHistory.vue'
import BrowserPreviewMore from './BrowserPreviewMore.vue'
import BrowserPreviewPickerBreadcrumbs from './picker/BrowserPreviewPickerBreadcrumbs.vue'
import BrowserPreviewPickerButton from './picker/BrowserPreviewPickerButton.vue'
import BrowserPreviewPickerStyles from './picker/BrowserPreviewPickerStyles.vue'
import { provideBrowserPicker } from './picker/use'

const open = defineModel<boolean>('open', { default: false })
const codingMode = defineModel<boolean>('codingMode', { default: false })
const { session } = defineProps<{ session: BrowserPreviewSession }>()
const store = useEditorStore()
const surface = ref<HTMLElement | null>(null)
const inputId = useId()
const addressField = useTemplateRef<InstanceType<typeof AppInput>>('addressField')
const ui = tv(theme)()
const historyConnection = bindDesktopLinkQueue({
  event: 'browser-preview:page-loaded',
  command: 'take_browser_preview_visits',
  schema: completedBrowserVisitSchema,
  label: 'Browser history',
  open: rememberBrowserVisit
}).catch(() => {
  browserHistoryError.value =
    'Browsing history could not be connected. Reopen the browser to try again.'
  return () => undefined
})
const addressFocused = ref(false)
const displayedAddress = computed({
  get: () => (addressFocused.value ? address.value : previewAddressLabel(address.value)),
  set: (value: string | number) => {
    address.value = String(value)
  }
})
async function selectAddress() {
  addressFocused.value = true
  await nextTick()
  addressField.value?.select()
}
function focusAddress() {
  addressField.value?.focus()
  addressField.value?.select()
}
async function navigate() {
  if (!address.value.trim()) return
  await preview.navigate()
}
let layoutQueued = false
let lastLayout = ''
let layoutRevision = 0
let disposed = false
let clearingPage = false
const backdropStyle = shallowRef<CSSProperties>({})
const zoom = ref(session.zoom)
function surfaceViewport() {
  if (!open.value || !surface.value) return null
  const rect = surface.value.getBoundingClientRect()
  return previewDockViewport(
    rect,
    preset.value as 'desktop' | 'tablet' | 'phone',
    window.innerWidth,
    window.innerHeight,
    zoom.value
  )
}
const allowedExport = (url: string) => (session.exportURLs.has(url) ? url : undefined)
const bridge = createBrowserPreviewNative(
  () => (hasPreviewOverlay() ? null : surfaceViewport()),
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
const backdrop = createBrowserBackdrop(async () => {
  if (!status.value) throw new Error('Open a page before preparing its backdrop.')
  return bridge.native.backdrop(status.value.url)
})
const busy = computed(() => actionBusy.value || backdrop.pending.value)
defineExpose({
  async openPage(url: string) {
    if (busy.value) throw new Error('Wait for the browser operation to finish, then export again.')
    address.value = url
    await navigate()
  }
})
function backdropKey() {
  return JSON.stringify([status.value?.url, status.value?.loading, preset.value, surfaceViewport()])
}
async function prepareBackdrop(whileHidden = false) {
  if (disposed || !open.value) return false
  if (!status.value?.captureAvailable || status.value.loading) return true
  const key = backdropKey()
  const revision = layoutRevision
  const isCurrent = () =>
    !disposed &&
    open.value &&
    revision === layoutRevision &&
    hasPreviewOverlay() === whileHidden &&
    backdropKey() === key
  try {
    return await backdrop.prepare(isCurrent)
  } catch (reason) {
    if (isCurrent()) error.value = reason instanceof Error ? reason.message : String(reason)
    return isCurrent()
  }
}
const picker = provideBrowserPicker(
  bridge.picker,
  () => status.value?.url ?? '',
  () => busy.value || !status.value || status.value.loading,
  (action) => {
    void (action === 'import' ? importPage() : capture())
  }
)
watch(
  () =>
    error.value ||
    picker.error.value ||
    browserHistoryError.value ||
    browserViewportPreferenceError.value,
  (message) => {
    if (message) toast.error(message)
  },
  { immediate: true }
)
watch(notice, (message) => {
  if (message) toast.info(message)
})
watch(
  () => status.value?.captureAvailable,
  (available) => {
    if (available === false) toast.info('Capture requires macOS.')
  }
)
async function importPage() {
  if (busy.value) return
  await preview.importPage(!!picker.state.value?.pick)
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
const selectedDevice = computed(
  () => PREVIEW_PRESETS.find((device) => device.value === preset.value) ?? PREVIEW_PRESETS[0]
)
const nextDevice = computed(
  () =>
    PREVIEW_PRESETS[(PREVIEW_PRESETS.indexOf(selectedDevice.value) + 1) % PREVIEW_PRESETS.length] ??
    PREVIEW_PRESETS[0]
)
function setZoom(value: number) {
  zoom.value = saveBrowserViewport(selectedDevice.value.value, value).zoom
}
function cycleDevice() {
  const device = nextDevice.value
  let value =
    device.value === 'desktop' ? browserViewportPreferences.value.responsiveZoom : zoom.value
  const rect = surface.value?.getBoundingClientRect()
  if (device.value !== 'desktop' && rect) {
    const fitted = previewDockViewport(rect, device.value, innerWidth, innerHeight, value)
    if (fitted) value = Math.max(0.1, Math.min(value, fitted.zoom, 1.5))
  }
  const choice = saveBrowserViewport(device.value, value)
  preset.value = choice.preset
  zoom.value = choice.zoom
}
async function closePage() {
  clearingPage = true
  await preview.clearPage()
  if (!status.value && !error.value) session.url = ''
  clearingPage = false
}
function openSuggestion(url: string) {
  address.value = url
  void navigate()
}
preset.value = session.preset
const { pause, resume } = useIntervalFn(preview.refresh, 1000, {
  immediate: false
})

function syncSurface() {
  if (layoutQueued || disposed) return
  layoutQueued = true
  // The editor's animation frames can pause while its native child has focus.
  queueMicrotask(() => {
    layoutQueued = false
    if (disposed) return
    const rect = surface.value?.getBoundingClientRect()
    const viewport = surfaceViewport()
    const bounds = viewport?.bounds
    backdropStyle.value =
      bounds && rect
        ? {
            left: `${bounds.x - rect.x}px`,
            top: `${bounds.y - rect.y}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`
          }
        : {}
    const overlay = !!hasPreviewOverlay()
    const key = JSON.stringify([
      rect?.x,
      rect?.y,
      rect?.width,
      rect?.height,
      preset.value,
      zoom.value,
      status.value?.url,
      status.value?.loading,
      overlay,
      open.value
    ])
    if (key === lastLayout) return
    const revision = ++layoutRevision
    lastLayout = key
    void bridge
      .syncBounds()
      .then(() =>
        overlay && revision === layoutRevision && hasUnpreparedPreviewOverlay()
          ? prepareBackdrop(true)
          : false
      )
      .catch((reason: unknown) => {
        if (revision !== layoutRevision) return
        lastLayout = ''
        if (!disposed) error.value = String(reason)
      })
  })
}
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
watch(preset, (value) => {
  session.preset = value
  backdrop.clear()
})
watch(zoom, (value) => {
  session.zoom = value
  backdrop.clear()
  syncSurface()
})
watch([preset, status], syncSurface)
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
  (url) => {
    backdrop.clear()
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
  backdrop.dispose()
  preview.dispose()
  void historyConnection.then((stop) => stop())
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
    <div role="toolbar" aria-label="Browser View controls" :class="ui.toolbar()">
      <div :class="ui.navigation()">
        <BrowserPreviewPickerButton :disabled="busy || !status || status.loading" />
        <IconButton
          label="Back"
          size="sm"
          :disabled="busy || !status || status.canGoBack === false"
          @click="preview.action('back')"
          ><icon-lucide-arrow-left class="size-3.5"
        /></IconButton>
        <IconButton
          label="Forward"
          size="sm"
          :disabled="busy || !status || status.canGoForward === false"
          @click="preview.action('forward')"
          ><icon-lucide-arrow-right class="size-3.5"
        /></IconButton>
        <IconButton
          label="Reload"
          size="sm"
          :disabled="busy || !status"
          @click="preview.action('reload')"
          ><icon-lucide-rotate-cw class="size-3.5"
        /></IconButton>
      </div>
      <form novalidate :class="ui.address()" @submit.prevent="navigate">
        <AppInput
          ref="addressField"
          :id="inputId"
          v-model="displayedAddress"
          aria-label="Web address"
          type="url"
          placeholder="Enter a URL"
          :class="ui.input()"
          :disabled="busy"
          @focus="selectAddress"
          @blur="addressFocused = false"
        />
        <BrowserPreviewHistory
          :disabled="busy"
          :prepare="prepareBackdrop"
          @navigate="openSuggestion"
        />
        <div :class="ui.addressActions()">
          <IconButton
            v-if="status?.url.startsWith('file:')"
            label="Open Folder"
            size="sm"
            :disabled="busy || status.loading"
            @click="openExternal(true)"
            ><icon-lucide-folder-open class="size-3.5"
          /></IconButton>
          <IconButton
            :label="`Viewport: ${selectedDevice.label}. Switch to ${nextDevice.label}`"
            :class="ui.viewport()"
            :disabled="busy"
            @click="cycleDevice"
          >
            <icon-lucide-monitor v-if="preset === 'desktop'" class="size-3.5" />
            <icon-lucide-smartphone v-else-if="preset === 'phone'" class="size-3.5" />
            <icon-lucide-tablet v-else class="size-3.5" />
          </IconButton>
          <IconButton
            v-if="status"
            label="Close this page"
            :class="ui.closePage()"
            :disabled="busy"
            @click="closePage"
            ><icon-lucide-x class="size-3.5"
          /></IconButton>
        </div>
      </form>
      <IconButton
        :label="
          picker.state.value?.pick
            ? 'Import the selection as nodes (Enter)'
            : 'Import editable page'
        "
        :class="ui.importButton()"
        size="sm"
        :disabled="busy || !status || status.loading || store.state.readOnly"
        @click="importPage"
        ><icon-lucide-code-xml :class="ui.importGlyph()" /><span :class="ui.importLabel()"
          >Import</span
        ></IconButton
      >
      <BrowserPreviewCapture
        :selected="!!picker.state.value?.pick"
        :prepare="prepareBackdrop"
        :disabled="busy || !status?.captureAvailable || status?.loading || store.state.readOnly"
        @capture="capture"
      />
      <span aria-hidden="true" :class="ui.separator()" />
      <IconButton
        :label="codingMode ? 'Exit Coding Mode' : 'Coding Mode'"
        :class="ui.codingButton()"
        size="sm"
        :aria-pressed="codingMode"
        :disabled="busy"
        @click="codingMode = !codingMode"
      >
        <icon-lucide-minimize-2 v-if="codingMode" class="size-3.5" />
        <icon-lucide-maximize-2 v-else class="size-3.5" />
      </IconButton>
      <BrowserPreviewMore
        :zoom="zoom"
        :fixed="preset !== 'desktop'"
        :disabled="busy"
        :page-available="!!status && !status.loading"
        :prepare="prepareBackdrop"
        @zoom="setZoom"
        @clear="clearSiteData"
        @external="openExternal"
      />
      <IconButton label="Close browser preview" size="sm" @click="open = false"
        ><icon-lucide-panel-right class="size-3.5"
      /></IconButton>
    </div>
    <BrowserPreviewPickerBreadcrumbs />
    <div ref="surface" data-test-id="browser-preview-surface" :class="ui.surface()">
      <img
        v-if="backdrop.src.value"
        :src="backdrop.src.value"
        alt=""
        aria-hidden="true"
        :draggable="false"
        data-slot="browser-backdrop"
        :class="ui.backdrop()"
        :style="backdropStyle"
      />
      <div v-if="!status" :class="ui.landing()">
        <div :class="ui.content()">
          <div :class="ui.introduction()">
            <div :class="ui.mark()"><icon-lucide-globe class="size-7" /></div>
            <h2 :class="ui.heading()">Import from the web</h2>
            <p :class="ui.description()">
              Open a live site or your localhost dev server, then bring it onto the canvas as
              editable layers.
            </p>
            <AppButton variant="outline" :class="ui.enter()" :disabled="busy" @click="focusAddress"
              >Enter a URL</AppButton
            >
          </div>
          <div :class="ui.features()">
            <div :class="ui.feature()">
              <div :class="ui.featureIcon()"><icon-lucide-panels-top-left class="size-5" /></div>
              <div>
                <h3 :class="ui.featureTitle()">Import the full page</h3>
                <p :class="ui.featureDescription()">Reproduce it as frames, text, and images.</p>
              </div>
            </div>
            <div :class="ui.feature()">
              <div :class="ui.featureIcon()"><icon-lucide-mouse-pointer-2 class="size-5" /></div>
              <div>
                <h3 :class="ui.featureTitle()">Import an element</h3>
                <p :class="ui.featureDescription()">
                  Select an element and reproduce its editable layers.
                </p>
              </div>
            </div>
            <div :class="ui.feature()">
              <div :class="ui.featureIcon()"><icon-lucide-image class="size-5" /></div>
              <div>
                <h3 :class="ui.featureTitle()">Import a screenshot</h3>
                <p :class="ui.featureDescription()">
                  Drop a PNG onto the canvas or send it to the agent.
                </p>
              </div>
            </div>
          </div>
          <div :class="ui.suggestions()">
            <div :class="ui.historyHeading()">
              <h3 :class="ui.suggestionsHeading()">
                <icon-lucide-gallery-vertical-end class="size-4" />{{
                  browserHistory.length ? 'Recent' : 'Suggested'
                }}
              </h3>
              <AppButton
                v-if="browserHistory.length"
                variant="ghost"
                size="xs"
                class="h-6 px-1 text-xs text-muted"
                :disabled="updatingBrowserHistory"
                @click="clearBrowserHistory"
                >Clear All</AppButton
              >
            </div>
            <div :class="ui.historyRows()">
              <div v-for="entry in browserHistory" :key="entry.url" class="group relative">
                <AppButton
                  variant="ghost"
                  :class="ui.historyRow()"
                  :disabled="busy"
                  @click="openSuggestion(entry.url)"
                  ><icon-lucide-globe class="size-3.5 shrink-0" /><span class="truncate">{{
                    previewAddressLabel(entry.url)
                  }}</span
                  ><icon-lucide-arrow-right :class="ui.historyArrow()"
                /></AppButton>
                <IconButton
                  :label="`Remove ${previewAddressLabel(entry.url)} from history`"
                  :class="ui.historyRemove()"
                  :disabled="updatingBrowserHistory"
                  @click="removeBrowserVisit(entry.url)"
                  ><icon-lucide-x class="size-3.5"
                /></IconButton>
              </div>
              <template v-if="!browserHistory.length">
                <AppButton
                  v-for="url in ['pen.dev', 'docs.pen.dev', 'localhost:8080']"
                  :key="url"
                  variant="ghost"
                  :class="ui.historyRow()"
                  :disabled="busy"
                  @click="openSuggestion(url)"
                  ><icon-lucide-globe class="size-3.5 shrink-0" /><span class="truncate">{{
                    url
                  }}</span
                  ><icon-lucide-arrow-right :class="ui.historyArrow()"
                /></AppButton>
              </template>
            </div>
          </div>
          <p :class="ui.privacy()">
            Pages run locally on your Mac. Passwords and form values are excluded from editable
            imports.
          </p>
        </div>
      </div>
    </div>
    <span v-if="status" class="sr-only" aria-live="polite"
      >{{ status.width }} × {{ status.height }}</span
    >
    <BrowserPreviewPickerStyles />
  </section>
</template>
