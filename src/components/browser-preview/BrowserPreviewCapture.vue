<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'

import type { BrowserCaptureScope } from '@/app/browser-preview/capture'
import IconButton from '@/components/ui/button/IconButton.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import theme from '@/theme/browser-preview'

defineProps<{ selected: boolean; disabled: boolean }>()
const emit = defineEmits<{ capture: [scope: BrowserCaptureScope] }>()
const menu = useMenuUI({
  content: theme.slots.popup,
  item: theme.slots.popupItem
})
</script>

<template>
  <IconButton
    v-if="selected"
    label="Screenshot the selection onto the canvas (Cmd+Enter)"
    size="sm"
    :disabled="disabled"
    @click="emit('capture', 'selected')"
  >
    <icon-lucide-camera class="size-3.5" />
  </IconButton>
  <DropdownMenuRoot v-else>
    <DropdownMenuTrigger as-child>
      <IconButton label="Screenshot" size="sm" :disabled="disabled">
        <icon-lucide-camera class="size-3.5" />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent align="end" :side-offset="4" :class="menu.content">
        <DropdownMenuItem :class="menu.item" @select="emit('capture', 'full')"
          >Full Page</DropdownMenuItem
        >
        <DropdownMenuItem :class="menu.item" @select="emit('capture', 'visible')"
          >Visible Area</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
