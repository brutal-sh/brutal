<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { nextTick, onScopeDispose, ref } from 'vue'

import {
  browserHistory,
  clearBrowserHistory,
  updatingBrowserHistory
} from '@/app/browser-preview/history/storage'
import { previewAddressLabel } from '@/app/browser-preview/schema'
import IconButton from '@/components/ui/button/IconButton.vue'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import theme from '@/theme/browser-preview'

const { prepare } = defineProps<{ disabled: boolean; prepare: () => Promise<boolean> }>()
const emit = defineEmits<{ navigate: [url: string] }>()
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
async function navigate(url: string) {
  open.value = false
  await nextTick()
  if (!disposed) emit('navigate', url)
}
onScopeDispose(() => {
  disposed = true
  revision++
})
const ui = tv(theme)()
const menu = useMenuUI({
  content:
    'w-80 max-w-[calc(100vw-16px)] max-h-[min(384px,var(--reka-dropdown-menu-content-available-height,384px))] rounded-[8px] border border-menu-border shadow-[0_8px_30px_rgb(0_0_0/0.4)]'
})
const item = menuItem({
  justify: 'start',
  class: 'h-7 rounded-[6px] font-medium data-[highlighted]:bg-border'
})
</script>

<template>
  <DropdownMenuRoot :open="open" @update:open="setOpen">
    <DropdownMenuTrigger as-child>
      <IconButton
        label="Browsing history"
        :class="ui.addressIcon()"
        :disabled="disabled || updatingBrowserHistory"
        ><icon-lucide-gallery-vertical-end class="size-3"
      /></IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        data-browser-preview-popup
        align="start"
        :side-offset="4"
        :class="menu.content"
      >
        <MenuScrollArea>
          <DropdownMenuItem
            v-for="entry in browserHistory"
            :key="entry.url"
            :class="item"
            @select="navigate(entry.url)"
            ><span class="truncate">{{ previewAddressLabel(entry.url) }}</span></DropdownMenuItem
          >
          <DropdownMenuItem v-if="!browserHistory.length" disabled :class="item"
            >No History</DropdownMenuItem
          >
          <template v-else>
            <DropdownMenuSeparator :class="menu.separator" />
            <DropdownMenuItem
              :class="[item, 'text-error']"
              :disabled="updatingBrowserHistory"
              @select="clearBrowserHistory"
              >Clear All History</DropdownMenuItem
            >
          </template>
        </MenuScrollArea>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
