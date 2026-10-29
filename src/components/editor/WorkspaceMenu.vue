<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { ref } from 'vue'

import AppMenu from '@/components/shell/AppMenu.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'

const open = ref(false)
const styles = usePopoverUI({ content: 'w-80 overflow-hidden rounded-2xl' })
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        aria-label="Main menu"
        class="flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-surface hover:bg-hover focus-visible:outline-panel-focus"
      >
        <icon-lucide-pen-line class="size-4" />
        Open Pen
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent side="bottom" align="start" :side-offset="8" :class="styles.content">
        <AppMenu @action="open = false" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
