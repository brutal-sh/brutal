<script setup lang="ts">
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from 'reka-ui'

import type { MenuEntry } from '@open-pencil/vue/editor/menu-model'

import {
  hasMenuSubItems,
  isMenuCheckbox,
  isMenuSeparator,
  menuChecked,
  menuDisabled,
  menuLabel,
  menuShortcut,
  menuSubItems,
  runMenuAction,
  updateMenuChecked
} from '@/app/shell/menu/entry'
import AppShortcutText from '@/components/ui/menu/AppShortcutText.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'

defineProps<{ items: MenuEntry[] }>()
const styles = useMenuUI({
  content: 'min-w-52 rounded-md border border-menu-border',
  item: 'h-6 gap-2 py-0 text-xs leading-4'
})
</script>

<template>
  <template v-for="(item, index) in items" :key="index">
    <DropdownMenuSeparator v-if="isMenuSeparator(item)" :class="styles.separator" />
    <DropdownMenuSub v-else-if="hasMenuSubItems(item)">
      <DropdownMenuSubTrigger :class="styles.item" :disabled="menuDisabled(item)">
        <span class="flex-1">{{ menuLabel(item) }}</span>
        <icon-lucide-chevron-right class="size-3 text-muted" aria-hidden="true" />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          :aria-label="menuLabel(item)"
          :side-offset="4"
          :class="styles.content"
        >
          <MenuScrollArea>
            <WorkspaceCommandItems :items="menuSubItems(item)" />
          </MenuScrollArea>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
    <DropdownMenuCheckboxItem
      v-else-if="isMenuCheckbox(item)"
      :model-value="menuChecked(item)"
      :disabled="menuDisabled(item)"
      :class="styles.item"
      @update:model-value="updateMenuChecked(item, $event === true)"
    >
      <span class="flex-1">{{ menuLabel(item) }}</span>
      <DropdownMenuItemIndicator>
        <icon-lucide-check class="size-3.5" />
      </DropdownMenuItemIndicator>
    </DropdownMenuCheckboxItem>
    <DropdownMenuItem
      v-else
      :class="styles.item"
      :disabled="menuDisabled(item)"
      @select="runMenuAction(item)"
    >
      <span class="flex-1">{{ menuLabel(item) }}</span>
      <AppShortcutText v-if="menuShortcut(item)">{{ menuShortcut(item) }}</AppShortcutText>
    </DropdownMenuItem>
  </template>
</template>
