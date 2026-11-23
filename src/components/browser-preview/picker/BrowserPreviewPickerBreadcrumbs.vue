<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import AppButton from '@/components/ui/button/AppButton.vue'
import theme from '@/theme/browser-picker'

import { useBrowserPicker } from './use'

const picker = useBrowserPicker()
const pick = computed(() => picker.state.value?.pick)
const ui = tv(theme)()
</script>

<template>
  <nav v-if="pick" aria-label="Selected element ancestry" :class="ui.breadcrumbs()">
    <template v-for="(part, index) in pick.path" :key="index">
      <icon-lucide-chevron-right v-if="index" :class="ui.chevron()" aria-hidden="true" />
      <AppButton
        :class="ui.crumb()"
        :data-active="index === pick.path.length - 1"
        :aria-current="index === pick.path.length - 1 ? 'location' : undefined"
        :disabled="picker.pending.value"
        @click="picker.select(index)"
        >{{ part.tag }}</AppButton
      >
    </template>
  </nav>
</template>
