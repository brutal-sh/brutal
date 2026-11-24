<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'

import type { BrowserCaptureScope } from '@/app/browser-preview/capture'
import {
  previewAddressLabel,
  type PreviewAction,
  type PreviewPreset,
  type PreviewStatus
} from '@/app/browser-preview/schema'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import theme from '@/theme/browser-preview'

import BrowserPreviewCapture from './BrowserPreviewCapture.vue'
import BrowserPreviewHistory from './BrowserPreviewHistory.vue'
import BrowserPreviewMore from './BrowserPreviewMore.vue'
import BrowserPreviewPickerButton from './picker/BrowserPreviewPickerButton.vue'

const { busy, status, device, nextDevice, selected, readOnly, zoom, prepare } = defineProps<{
  busy: boolean
  status: PreviewStatus | null
  device: PreviewPreset
  nextDevice: PreviewPreset
  selected: boolean
  readOnly: boolean
  zoom: number
  prepare: () => Promise<boolean>
}>()
const address = defineModel<string>('address', { required: true })
const codingMode = defineModel<boolean>('codingMode', { required: true })
const emit = defineEmits<{
  navigate: []
  suggestion: [url: string]
  action: [action: PreviewAction]
  external: [folder?: boolean]
  cycle: []
  clearPage: []
  import: []
  capture: [scope: BrowserCaptureScope]
  zoom: [value: number]
  clear: []
  close: []
}>()
const ui = tv(theme)()
const inputId = useId()
const addressField = useTemplateRef<InstanceType<typeof AppInput>>('addressField')
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
watch(
  () => status?.url,
  (url) => {
    if (url && document.activeElement?.id !== inputId) address.value = url
  }
)
defineExpose({ focusAddress })
</script>

<template>
  <div role="toolbar" aria-label="Browser View controls" :class="ui.toolbar()">
    <div :class="ui.navigation()">
      <BrowserPreviewPickerButton :disabled="busy || !status || status.loading" />
      <IconButton
        label="Back"
        size="sm"
        :disabled="busy || !status || status.canGoBack === false"
        @click="emit('action', 'back')"
        ><icon-lucide-arrow-left class="size-3.5"
      /></IconButton>
      <IconButton
        label="Forward"
        size="sm"
        :disabled="busy || !status || status.canGoForward === false"
        @click="emit('action', 'forward')"
        ><icon-lucide-arrow-right class="size-3.5"
      /></IconButton>
      <IconButton
        label="Reload"
        size="sm"
        :disabled="busy || !status"
        @click="emit('action', 'reload')"
        ><icon-lucide-rotate-cw class="size-3.5"
      /></IconButton>
    </div>
    <form novalidate :class="ui.address()" @submit.prevent="emit('navigate')">
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
        :prepare="prepare"
        @navigate="emit('suggestion', $event)"
      />
      <div :class="ui.addressActions()">
        <IconButton
          v-if="status?.url.startsWith('file:')"
          label="Open Folder"
          size="sm"
          :disabled="busy || status.loading"
          @click="emit('external', true)"
          ><icon-lucide-folder-open class="size-3.5"
        /></IconButton>
        <IconButton
          :label="`Viewport: ${device.label}. Switch to ${nextDevice.label}`"
          :class="ui.viewport()"
          :disabled="busy"
          @click="emit('cycle')"
        >
          <icon-lucide-monitor v-if="device.value === 'desktop'" class="size-3.5" />
          <icon-lucide-smartphone v-else-if="device.value === 'phone'" class="size-3.5" />
          <icon-lucide-tablet v-else class="size-3.5" />
        </IconButton>
        <IconButton
          v-if="status"
          label="Close this page"
          :class="ui.closePage()"
          :disabled="busy"
          @click="emit('clearPage')"
          ><icon-lucide-x class="size-3.5"
        /></IconButton>
      </div>
    </form>
    <IconButton
      :label="selected ? 'Import the selection as nodes (Enter)' : 'Import editable page'"
      :class="ui.importButton()"
      size="sm"
      :disabled="busy || !status || status.loading || readOnly"
      @click="emit('import')"
      ><icon-lucide-code-xml :class="ui.importGlyph()" /><span :class="ui.importLabel()"
        >Import</span
      ></IconButton
    >
    <BrowserPreviewCapture
      :selected="!!selected"
      :prepare="prepare"
      :disabled="busy || !status?.captureAvailable || status?.loading || readOnly"
      @capture="emit('capture', $event)"
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
      <icon-lucide-minimize-2 v-if="codingMode" class="size-4" />
      <icon-lucide-maximize-2 v-else class="size-4" />
    </IconButton>
    <BrowserPreviewMore
      :zoom="zoom"
      :fixed="device.value !== 'desktop'"
      :disabled="busy"
      :page-available="!!status && !status.loading"
      :prepare="prepare"
      @zoom="emit('zoom', $event)"
      @clear="emit('clear')"
      @external="emit('external')"
    />
    <IconButton label="Close browser preview" size="sm" @click="emit('close')"
      ><icon-lucide-panel-right class="size-3.5"
    /></IconButton>
  </div>
</template>
