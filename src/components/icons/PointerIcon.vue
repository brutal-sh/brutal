<script setup lang="ts">
import IconPointer from '~icons/brutal/pointer'

import { appPreferences } from '@/app/settings/preferences/store'
</script>

<template>
  <IconPointer
    class="data-[mirrored=true]:-scale-x-100"
    :data-mirrored="appPreferences.appearance.pointer === 'left'"
    aria-hidden="true"
    focusable="false"
  />
</template>
