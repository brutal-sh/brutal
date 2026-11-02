<script setup lang="ts">
import {
  useIntervalFn,
  useResizeObserver,
  useEventListener,
  useMutationObserver
} from '@vueuse/core'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import {
  computed,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  useId,
  useTemplateRef,
  watch
} from 'vue'

import type { BrowserPreviewSession } from '@/app/browser-preview/context'
import { createBrowserPreviewController } from '@/app/browser-preview/controller'
import { hasPreviewOverlay, previewDockBounds } from '@/app/browser-preview/dock'
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
import { createBrowserPreviewNative } from '@/app/browser-preview/native'
import { browserCaptureTarget } from '@/app/browser-preview/placement'
import { PREVIEW_PRESETS, previewAddressLabel } from '@/app/browser-preview/schema'
import { useEditorStore } from '@/app/editor/active-store'
import { bindDesktopLinkQueue } from '@/app/tauri/link-queue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import theme from '@/theme/browser-preview'

const open = defineModel<boolean>('open', { default: false })
const codingMode = defineModel<boolean>('codingMode', { default: false })
const { session } = defineProps<{ session: BrowserPreviewSession }>()
const store = useEditorStore()
const surface = ref<HTMLElement | null>(null)
const inputId = useId()
const addressField = useTemplateRef<InstanceType<typeof AppInput>>('addressField')
const ui = tv(theme)()
const historyOpen = ref(false)
const historyMenu = useMenuUI({
  content:
    'w-80 max-w-[calc(100vw-16px)] max-h-[min(384px,var(--reka-dropdown-menu-content-available-height,384px))] rounded-[8px] border border-menu-border shadow-[0_8px_30px_rgb(0_0_0/0.4)]'
})
const historyItem = menuItem({
  justify: 'start',
  class: 'h-7 rounded-[6px] font-medium data-[highlighted]:bg-border'
})
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
async function openHistoryEntry(url: string) {
  historyOpen.value = false
  await nextTick()
  openSuggestion(url)
}
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
let frame = 0
let lastLayout = ''
let disposed = false
let clearingPage = false
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
const preview = createBrowserPreviewController(
  bridge.native,
  () => browserCaptureTarget(store),
  () => browserImportTarget(store, () => open.value)
)
const { address, preset, status, busy, error, notice } = preview
const selectedDevice = computed(
  () => PREVIEW_PRESETS.find((device) => device.value === preset.value) ?? PREVIEW_PRESETS[0]
)
const nextDevice = computed(
  () =>
    PREVIEW_PRESETS[(PREVIEW_PRESETS.indexOf(selectedDevice.value) + 1) % PREVIEW_PRESETS.length] ??
    PREVIEW_PRESETS[0]
)
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
watch(preset, (value) => {
  session.preset = value
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
  if (frame) cancelAnimationFrame(frame)
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
        <IconButton
          label="Back"
          size="sm"
          :disabled="busy || !status"
          @click="preview.action('back')"
          ><icon-lucide-arrow-left class="size-3.5"
        /></IconButton>
        <IconButton
          label="Forward"
          size="sm"
          :disabled="busy || !status"
          @click="preview.action('forward')"
          ><icon-lucide-arrow-right class="size-3.5"
        /></IconButton>
        <IconButton
          label="Reload page"
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
        <DropdownMenuRoot v-model:open="historyOpen">
          <DropdownMenuTrigger as-child>
            <IconButton
              label="Browsing history"
              :class="ui.addressIcon()"
              :disabled="busy || updatingBrowserHistory"
              ><icon-lucide-gallery-vertical-end class="size-3"
            /></IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent align="start" :side-offset="4" :class="historyMenu.content">
              <MenuScrollArea>
                <DropdownMenuItem
                  v-for="entry in browserHistory"
                  :key="entry.url"
                  :class="historyItem"
                  @select="openHistoryEntry(entry.url)"
                  ><span class="truncate">{{
                    previewAddressLabel(entry.url)
                  }}</span></DropdownMenuItem
                >
                <DropdownMenuItem v-if="!browserHistory.length" disabled :class="historyItem"
                  >No History</DropdownMenuItem
                >
                <template v-else>
                  <DropdownMenuSeparator :class="historyMenu.separator" />
                  <DropdownMenuItem
                    :class="[historyItem, 'text-error']"
                    :disabled="updatingBrowserHistory"
                    @select="clearBrowserHistory"
                    >Clear All History</DropdownMenuItem
                  >
                </template>
              </MenuScrollArea>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <div :class="ui.addressActions()">
          <IconButton
            :label="`Viewport: ${selectedDevice.label}. Switch to ${nextDevice.label}`"
            :class="ui.viewport()"
            :disabled="busy"
            @click="preset = nextDevice.value"
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
        label="Import editable page"
        size="sm"
        :disabled="busy || !status || status.loading || store.state.readOnly"
        @click="preview.importPage"
        ><icon-lucide-import class="size-3.5"
      /></IconButton>
      <IconButton
        label="Capture into this design"
        size="sm"
        :disabled="busy || !status?.captureAvailable || status?.loading || store.state.readOnly"
        @click="preview.capture"
        ><icon-lucide-camera class="size-3.5"
      /></IconButton>
      <IconButton
        :label="codingMode ? 'Exit Coding Mode' : 'Coding Mode'"
        size="sm"
        :aria-pressed="codingMode"
        :disabled="busy"
        @click="codingMode = !codingMode"
      >
        <icon-lucide-minimize-2 v-if="codingMode" class="size-3.5" />
        <icon-lucide-maximize-2 v-else class="size-3.5" />
      </IconButton>
      <span aria-hidden="true" :class="ui.separator()" />
      <IconButton label="Close browser preview" size="sm" @click="open = false"
        ><icon-lucide-x class="size-3.5"
      /></IconButton>
    </div>
    <div
      v-if="error || browserHistoryError || notice || (status && !status.captureAvailable)"
      class="p-2"
      aria-live="polite"
    >
      <AppAlert v-if="error" tone="error" heading="Browser action failed" :description="error" />
      <AppAlert
        v-else-if="browserHistoryError"
        tone="error"
        heading="History update failed"
        :description="browserHistoryError"
      />
      <AppAlert
        v-else-if="notice"
        tone="success"
        heading="Browser content added"
        :description="notice"
      />
      <AppAlert
        v-else
        heading="Capture requires macOS"
        description="Navigation is available on this platform."
      />
    </div>
    <div ref="surface" data-test-id="browser-preview-surface" :class="ui.surface()">
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
                <p :class="ui.featureDescription()">Element selection is not available yet.</p>
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
  </section>
</template>
