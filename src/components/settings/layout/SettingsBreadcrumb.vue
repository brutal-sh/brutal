<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useI18n } from '@open-pencil/vue/i18n'

import theme from '@/theme/settings/breadcrumb'

const { section, parent, current } = defineProps<{
  section?: string
  parent: string
  current: string
}>()
const emit = defineEmits<{ back: [] }>()
const { common } = useI18n()
const styles = tv(theme)()
</script>

<template>
  <span :class="styles.root()" data-test-id="settings-breadcrumb">
    <template v-if="section">
      <span :class="styles.section()">{{ section }}</span>
      <icon-lucide-chevron-right :class="styles.separator()" aria-hidden="true" />
    </template>
    <button
      type="button"
      :class="styles.step()"
      data-test-id="settings-editor-back"
      @click="emit('back')"
    >
      <span class="sr-only">{{ common.back }}: </span>
      {{ parent }}
    </button>
    <icon-lucide-chevron-right :class="styles.separator()" aria-hidden="true" />
    <span :class="styles.current()" aria-current="page">{{ current }}</span>
  </span>
</template>
