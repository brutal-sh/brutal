<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from 'reka-ui'
import { onScopeDispose, ref } from 'vue'

import { BROWSER_ZOOM_LEVELS, nextBrowserZoom } from '@/app/browser-preview/zoom'
import IconButton from '@/components/ui/button/IconButton.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import theme from '@/theme/browser-preview'

const { prepare, zoom } = defineProps<{
  zoom: number
  fixed: boolean
  disabled: boolean
  pageAvailable: boolean
  prepare: () => Promise<boolean>
}>()
const emit = defineEmits<{ zoom: [value: number]; clear: []; external: [] }>()
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
const menu = useMenuUI({
  content: theme.slots.popup,
  item: theme.slots.popupItem,
  separator: theme.slots.popupSeparator
})
</script>

<template>
  <DropdownMenuRoot :open="open" @update:open="setOpen">
    <DropdownMenuTrigger as-child>
      <IconButton
        label="More options"
        size="sm"
        :class="theme.slots.moreButton"
        :disabled="disabled"
      >
        <icon-lucide-ellipsis class="size-3.5" />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        data-browser-preview-popup
        align="end"
        :side-offset="4"
        :class="menu.content"
      >
        <DropdownMenuItem
          :class="menu.item"
          :disabled="fixed || zoom >= 1.5"
          @select="emit('zoom', nextBrowserZoom(zoom, 1))"
          >Zoom In</DropdownMenuItem
        >
        <DropdownMenuItem
          :class="menu.item"
          :disabled="fixed || zoom <= 0.25"
          @select="emit('zoom', nextBrowserZoom(zoom, -1))"
          >Zoom Out</DropdownMenuItem
        >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger :class="menu.item" :disabled="fixed">
            <span>Zoom: {{ Math.round(zoom * 100) }}%</span>
            <icon-lucide-chevron-right class="size-3 text-muted" />
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent
              :side-offset="4"
              :class="menu.content"
              aria-label="Browser zoom"
            >
              <DropdownMenuRadioGroup :model-value="String(zoom)">
                <DropdownMenuRadioItem
                  v-for="level in BROWSER_ZOOM_LEVELS"
                  :key="level"
                  :value="String(level)"
                  :class="menu.item"
                  @select="emit('zoom', level)"
                >
                  <span>{{ Math.round(level * 100) }}%</span>
                  <DropdownMenuItemIndicator
                    ><icon-lucide-check class="size-3.5"
                  /></DropdownMenuItemIndicator>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem
          :class="menu.item"
          :disabled="fixed || zoom === 1"
          @select="emit('zoom', 1)"
          >Reset Zoom to 100%</DropdownMenuItem
        >
        <DropdownMenuSeparator :class="menu.separator" />
        <DropdownMenuItem :class="menu.item" :disabled="!pageAvailable" @select="emit('clear')"
          >Empty Cache and Reload</DropdownMenuItem
        >
        <DropdownMenuSeparator :class="menu.separator" />
        <DropdownMenuItem :class="menu.item" :disabled="!pageAvailable" @select="emit('external')"
          >Open in System Browser</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
