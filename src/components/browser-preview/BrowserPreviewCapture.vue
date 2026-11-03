<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { onScopeDispose, ref, watch } from 'vue'

import type { BrowserCaptureScope } from '@/app/browser-preview/capture'
import IconButton from '@/components/ui/button/IconButton.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import theme from '@/theme/browser-preview'

const { prepare, selected } = defineProps<{
  selected: boolean
  disabled: boolean
  prepare: () => Promise<boolean>
}>()
const emit = defineEmits<{ capture: [scope: BrowserCaptureScope] }>()
const open = ref(false)
let revision = 0
let disposed = false
async function setOpen(value: boolean) {
  const request = ++revision
  if (!value) {
    open.value = false
    return
  }
  if ((await prepare()) && request === revision && !disposed) open.value = true
}
onScopeDispose(() => {
  disposed = true
  revision++
})
watch(
  () => selected,
  () => {
    revision++
    open.value = false
  }
)
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
  <DropdownMenuRoot v-else :open="open" @update:open="setOpen">
    <DropdownMenuTrigger as-child>
      <IconButton label="Screenshot" size="sm" :disabled="disabled">
        <icon-lucide-camera class="size-3.5" />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        data-browser-preview-popup
        align="end"
        :side-offset="4"
        :class="menu.content"
      >
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
