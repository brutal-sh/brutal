<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'
import IconOpacity from '~icons/lucide/blend'
import IconShadow from '~icons/lucide/layers'
import IconPosition from '~icons/lucide/locate'
import IconMargin from '~icons/lucide/move'
import IconFill from '~icons/lucide/paint-bucket'
import IconRadius from '~icons/lucide/radius'
import IconLayout from '~icons/lucide/scan'
import IconPadding from '~icons/lucide/scan-line'
import IconBorder from '~icons/lucide/square'
import IconTypography from '~icons/lucide/type'

import { usePanelMessages } from '@open-pencil/vue/i18n'

import { browserSelectionCSS, browserSelectionStyles } from '@/app/browser-preview/picker/styles'
import { useActionToast } from '@/app/shell/toast/action'
import { writeTauriClipboardText } from '@/app/tauri/clipboard'
import AppButton from '@/components/ui/button/AppButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import theme from '@/theme/browser-picker'

import { useBrowserPicker } from './use'

const picker = useBrowserPicker()
const messages = usePanelMessages()
const pick = computed(() => picker.state.value?.pick)
const groups = computed(() => (pick.value ? browserSelectionStyles(pick.value) : []))
const icons = {
  layout: IconLayout,
  position: IconPosition,
  fill: IconFill,
  border: IconBorder,
  radius: IconRadius,
  padding: IconPadding,
  margin: IconMargin,
  typography: IconTypography,
  opacity: IconOpacity,
  shadow: IconShadow
}
const { copy } = useClipboard({ legacy: true })
const { showActionToast } = useActionToast()
const ui = tv(theme)()
async function copyValue(value: string, label: string) {
  try {
    if (!(await writeTauriClipboardText(value))) await copy(value)
    showActionToast(`${label} copied`)
  } catch {
    picker.error.value = 'The selected element information could not be copied. Try again.'
  }
}
</script>

<template>
  <div v-if="pick" role="toolbar" aria-label="Selected element styles" :class="ui.styles()">
    <Tip as-child :label="messages.copyAllStyles"
      ><AppButton
        :class="ui.value()"
        :aria-label="messages.copyAllStyles"
        @click="copyValue(browserSelectionCSS(pick), 'Styles')"
        >Style</AppButton
      ></Tip
    >
    <Tip as-child :label="pick.classes ? messages.copyClass : messages.noClassOnElement"
      ><AppButton
        :class="ui.value()"
        aria-label="Copy class"
        :disabled="!pick.classes"
        @click="copyValue(pick.classes, 'Class')"
        >Class</AppButton
      ></Tip
    >
    <div v-for="group in groups" :key="group.id" :class="ui.group()">
      <Tip as-child :label="`Copy ${group.label}`"
        ><AppButton
          :class="ui.value()"
          :aria-label="`Copy ${group.label}`"
          @click="copyValue(group.values.map((value) => value.text).join(' '), group.label)"
          ><component :is="icons[group.id]" :class="ui.icon()" /></AppButton
      ></Tip>
      <template v-for="(value, index) in group.values" :key="value.label">
        <span v-if="group.id === 'layout' && index === 1" :class="ui.muted()">×</span>
        <Tip as-child :label="`Copy ${value.label}`"
          ><AppButton
            :class="ui.value()"
            :aria-label="`Copy ${value.label}`"
            @click="copyValue(value.text, value.label)"
            >{{ group.id === 'position' ? value.label : '' }}{{ value.display }}</AppButton
          ></Tip
        >
      </template>
    </div>
  </div>
</template>
