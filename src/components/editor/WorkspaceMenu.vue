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
import IconGlobe from '~icons/lucide/globe'
import IconLifeBuoy from '~icons/lucide/life-buoy'

import { createSharedEditorMenuActions } from '@/app/shell/menu/actions/editor'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { useAppTheme } from '@/app/shell/theme'
import WorkspaceCommandItems from '@/components/editor/WorkspaceCommandItems.vue'
import ExternalLink from '@/components/links/ExternalLink.vue'
import AppShortcutText from '@/components/ui/menu/AppShortcutText.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import { IS_TAURI, OPEN_PEN_REPOSITORY_URL } from '@/constants'

const open = ref(false)
const { topMenus } = useAppMenu()
const browserCommands = computed(() => [
  {
    label: 'Commands',
    sub: topMenus.value.map((menu) => ({ label: menu.label, sub: menu.items }))
  }
])
const { toggleTheme, setTheme } = useAppTheme()
const actions = createSharedEditorMenuActions(setTheme)
const repository = OPEN_PEN_REPOSITORY_URL
const links = [
  { label: 'Open Pen on GitHub', href: repository, icon: IconGithub },
  { label: 'Get support on GitHub', href: `${repository}/issues`, icon: IconLifeBuoy },
  {
    label: 'Open Pen documentation',
    href: `${repository}/blob/HEAD/README.md`,
    icon: IconBookOpen
  },
  { label: 'OpenPencil website', href: 'https://openpencil.dev', icon: IconGlobe }
]
const styles = useMenuUI({
  content: 'w-[216px] rounded-md border border-menu-border bg-panel p-1 shadow-lg',
  item: 'h-6 w-full justify-start gap-2 px-2 py-0 text-xs leading-4 font-normal no-underline',
  separator: 'mx-1 my-1 h-px bg-border'
})
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger as-child>
      <button
        aria-label="Main menu"
        class="flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-surface hover:bg-hover focus-visible:outline-panel-focus"
      >
        <icon-lucide-pen-line class="size-4" />
        Open Pen
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        aria-label="Open Pen menu"
        side="bottom"
        align="start"
        :side-offset="8"
        :class="styles.content"
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
          <ExternalLink
            :href="`${repository}/blob/HEAD/packages/docs/reference/cli.md`"
            :ui="{ base: styles.item, icon: 'hidden' }"
          >
            <icon-lucide-terminal class="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            Open Pen CLI docs
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
