<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed, ref } from 'vue'
import IconBookOpen from '~icons/lucide/book-open'
import IconGithub from '~icons/lucide/github'
import IconLifeBuoy from '~icons/lucide/life-buoy'

import { useEditorStore } from '@/app/editor/active-store'
import { createSharedEditorMenuActions } from '@/app/shell/menu/actions/editor'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { popupWorkspaceMenu } from '@/app/shell/menu/workspace'
import { BRUTAL_SUPPORT_URL, brutalBugReportURL } from '@/app/shell/support/links'
import { useAppTheme } from '@/app/shell/theme'
import { toast } from '@/app/shell/ui'
import BrandMark from '@/components/brand/BrandMark.vue'
import WorkspaceCommandItems from '@/components/editor/WorkspaceCommandItems.vue'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppShortcutText from '@/components/ui/menu/AppShortcutText.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import { IS_TAURI, OPEN_PEN_CLI_GUIDE_URL, OPEN_PEN_HELP_URL } from '@/constants'

const store = useEditorStore()
const open = ref(false)
const nativeOpen = ref(false)
const { topMenus } = useAppMenu()
const browserCommands = computed(() => [
  {
    label: 'Commands',
    sub: topMenus.value.map((menu) => ({ label: menu.label, sub: menu.items }))
  }
])
const { toggleTheme, setTheme } = useAppTheme()
const actions = createSharedEditorMenuActions(setTheme)
const repository = BRUTAL_SUPPORT_URL
const links = [
  { label: 'Brutal on GitHub', href: repository, icon: IconGithub },
  { label: 'Report an Issue', href: brutalBugReportURL(), icon: IconLifeBuoy },
  {
    label: 'Brutal documentation',
    href: OPEN_PEN_HELP_URL,
    icon: IconBookOpen
  }
]
const styles = useMenuUI({
  content: 'w-[216px] rounded-md border border-menu-border bg-panel p-1 shadow-lg',
  item: 'h-6 w-full justify-start gap-2 px-2 py-0 text-xs leading-4 font-normal no-underline',
  separator: 'mx-1 my-1 h-px bg-border'
})

async function openNativeMenu(event: MouseEvent | KeyboardEvent) {
  if (nativeOpen.value || !(event.currentTarget instanceof HTMLButtonElement)) return
  const trigger = event.currentTarget
  const rect = trigger.getBoundingClientRect()
  nativeOpen.value = true
  try {
    await popupWorkspaceMenu({ x: rect.left, y: rect.bottom + 2 }, links, {
      toggleTheme,
      toggleUI: actions['toggle-ui']
    })
  } catch (error) {
    console.error('[Menu] Failed to open the native workspace menu:', error)
    toast.error('Could not open the application menu.')
  } finally {
    nativeOpen.value = false
    if (trigger.isConnected) trigger.focus()
  }
}
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <button
      v-if="IS_TAURI"
      type="button"
      aria-label="Main menu"
      aria-haspopup="menu"
      :aria-expanded="nativeOpen"
      class="flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-surface hover:bg-hover focus-visible:outline-panel-focus"
      @click="openNativeMenu"
      @keydown.down.prevent="openNativeMenu"
    >
      <BrandMark decorative class="size-4" />
      Brutal
    </button>
    <DropdownMenuTrigger v-else as-child>
      <button
        aria-label="Main menu"
        class="flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-surface hover:bg-hover focus-visible:outline-panel-focus"
      >
        <BrandMark decorative class="size-4" />
        Brutal
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal v-if="!IS_TAURI">
      <DropdownMenuContent
        aria-label="Brutal menu"
        side="bottom"
        align="start"
        :side-offset="8"
        :class="styles.content"
        @close-auto-focus="
          (event) => {
            if (store.state.iconPickerOpen) event.preventDefault()
          }
        "
      >
        <DropdownMenuItem v-for="link in links" :key="link.href" as-child>
          <ExternalLink :href="link.href" :ui="{ base: styles.item, icon: 'hidden' }">
            <component :is="link.icon" class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            {{ link.label }}
          </ExternalLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator :class="styles.separator" />
        <DropdownMenuItem :class="styles.item" @select="toggleTheme">
          <icon-lucide-sun-moon class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          Toggle Light/Dark mode
        </DropdownMenuItem>
        <DropdownMenuItem :class="styles.item" @select="actions['toggle-ui']">
          <icon-lucide-panels-top-left class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span class="flex-1">Show/Hide UI</span>
          <AppShortcutText>{{ appMenuShortcutLabel('toggle-ui') }}</AppShortcutText>
        </DropdownMenuItem>
        <DropdownMenuSeparator :class="styles.separator" />
        <DropdownMenuItem as-child>
          <ExternalLink :href="OPEN_PEN_CLI_GUIDE_URL" :ui="{ base: styles.item, icon: 'hidden' }">
            <icon-lucide-terminal class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            Brutal CLI docs
          </ExternalLink>
        </DropdownMenuItem>
        <template v-if="!IS_TAURI">
          <DropdownMenuSeparator :class="styles.separator" />
          <WorkspaceCommandItems :items="browserCommands" />
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
