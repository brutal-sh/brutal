<script setup lang="ts">
import { computed } from 'vue'
import IconPointer from '~icons/brutal/pointer'
import IconSystemPointer from '~icons/lucide/mouse-pointer-2'

import { appPreferences } from '@/app/settings/preferences/store'

const icon = computed(() =>
  appPreferences.value.appearance.pointer === 'system' ? IconSystemPointer : IconPointer
)
</script>

<template>
  <component
    :is="icon"
    class="data-[mirrored=true]:-scale-x-100"
    :data-mirrored="appPreferences.appearance.pointer === 'left'"
    aria-hidden="true"
    focusable="false"
  />
</template>
