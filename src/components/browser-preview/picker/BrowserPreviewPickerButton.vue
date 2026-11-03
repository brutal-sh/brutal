<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import IconButton from '@/components/ui/button/IconButton.vue'
import theme from '@/theme/browser-picker'

import { useBrowserPicker } from './use'

const { disabled = false } = defineProps<{ disabled?: boolean }>()
const picker = useBrowserPicker()
const active = computed(() => !!(picker.state.value?.picking || picker.state.value?.pick))
const ui = tv(theme)()
</script>

<template>
  <IconButton
    :label="active ? 'Stop selecting an element' : 'Select an element'"
    :class="ui.button()"
    :active="active"
    :disabled="disabled || picker.pending.value"
    @click="active ? picker.stop() : picker.start()"
  >
    <icon-lucide-square-mouse-pointer class="size-3.5" />
  </IconButton>
</template>
