<script setup lang="ts">
import { useFocus } from '@vueuse/core'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import ChatHistoryList from '@/components/chat/ChatHistoryList.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import { menuItem, useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import iconButtonTheme from '@/theme/button/icon-button'
import historyTheme from '@/theme/chat/history'

const chatHistoryTheme = tv(historyTheme)

const {
  conversations,
  selectedId,
  disabled = false,
  saved = false,
  docked = false,
  floating = false
} = defineProps<{
  conversations: { id: string; title: string; documentName: string; available: boolean }[]
  selectedId?: string
  disabled?: boolean
  saved?: boolean
  docked?: boolean
  floating?: boolean
}>()
const emit = defineEmits<{
  select: [id: string]
  create: []
  rename: [id: string, title: string]
  saveTrace: [id: string]
  delete: [id: string]
}>()
const { ai, menu: labels } = useI18n()
const triggerClass = tv(iconButtonTheme)({ size: 'sm' })
const styles = computed(() => chatHistoryTheme({ docked, floating }))
const menu = useMenuUI({ content: 'min-w-44' })
const item = menuItem({ justify: 'start' })
const open = ref(false)
const all = ref(false)
const query = ref('')
const editing = ref(false)
const confirming = ref(false)
const title = ref('')
const titleInput = ref<HTMLInputElement>()
const { focused } = useFocus(titleInput)
const historyTrigger = useTemplateRef<InstanceType<typeof PopoverTrigger>>('historyTrigger')
let restoreRecentFocus = false
const focusHistoryAfterMenu = ref(false)
const selected = computed(() => conversations.find((chat) => chat.id === selectedId))
const recent = computed(() =>
  conversations.filter((chat) => chat.available && chat.id !== selectedId).slice(0, 2)
)
watch(
  () => selectedId,
  () => {
    editing.value = false
    confirming.value = false
  }
)
// A selected shortcut becomes the active chat and leaves the recent list.
watch(
  () => [selectedId, disabled] as const,
  ([, busy]) => {
    if (busy || !restoreRecentFocus) return
    restoreRecentFocus = false
    const trigger: unknown = historyTrigger.value?.$el
    if (document.activeElement === document.body && trigger instanceof HTMLElement) trigger.focus()
  },
  { flush: 'post' }
)
function chooseRecent(id: string) {
  restoreRecentFocus = true
  choose(id)
}
function choose(id: string) {
  open.value = false
  emit('select', id)
}
async function rename() {
  confirming.value = false
  title.value = selected.value?.title ?? ''
  editing.value = true
  await nextTick()
  focused.value = true
  titleInput.value?.select()
}
function confirmDelete() {
  editing.value = false
  confirming.value = true
}
function remove() {
  if (selectedId) emit('delete', selectedId)
  confirming.value = false
}
function save() {
  if (selectedId && title.value.trim()) emit('rename', selectedId, title.value)
  editing.value = false
}
function closeMenu(event: Event) {
  if (editing.value || focusHistoryAfterMenu.value) event.preventDefault()
  if (focusHistoryAfterMenu.value) {
    focusHistoryAfterMenu.value = false
    open.value = true
  }
}
</script>

<template>
  <div :class="styles.root()">
    <div :class="styles.header()">
      <slot name="leading" />
      <PopoverRoot v-model:open="open">
        <PopoverTrigger
          ref="historyTrigger"
          :class="styles.trigger()"
          :disabled="disabled"
          :aria-label="ai.chatHistory"
          :aria-description="floating ? selected?.title || ai.newChat : undefined"
        >
          <span :class="styles.title()">{{ selected?.title || ai.newChat }}</span>
          <icon-lucide-chevron-down v-if="!floating" :class="styles.icon()" />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            align="start"
            :side-offset="6"
            :class="styles.content()"
            :aria-label="ai.chatHistory"
          >
            <ChatHistoryList
              v-model:all="all"
              v-model:query="query"
              :conversations="conversations"
              :selected-id="selectedId"
              :disabled="disabled"
              @select="choose"
            />
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <template v-if="floating">
        <Tip
          v-for="(chat, index) in recent"
          :key="chat.id"
          :label="chat.title || ai.newChat"
          as-child
          truncated
        >
          <button
            type="button"
            :class="styles.recent()"
            :disabled="disabled"
            @click="chooseRecent(chat.id)"
          >
            <span
              aria-hidden="true"
              class="size-[5px] shrink-0 rounded-full"
              :class="index === 0 ? 'bg-[#bce5e6]' : 'bg-[#e5b7c7]'"
            />
            <span class="truncate">{{ chat.title || ai.newChat }}</span>
          </button>
        </Tip>
      </template>
      <div v-if="floating" class="min-w-0 flex-1" aria-hidden="true" />
      <slot name="actions" />
      <AppButton
        v-if="docked || floating"
        :size="floating ? 'sm' : 'md'"
        :variant="floating ? 'ghost' : 'outline'"
        :ui="{ base: styles.create() }"
        :aria-label="ai.newChat"
        :disabled="disabled"
        @click="emit('create')"
      >
        <template #leading><icon-lucide-plus /></template>
        <span :class="floating ? 'hidden @min-[310px]/history:inline' : undefined">
          {{ labels.new }}
        </span>
      </AppButton>
      <IconButton v-else :label="ai.newChat" :disabled="disabled" size="sm" @click="emit('create')"
        ><icon-lucide-plus :class="styles.icon()"
      /></IconButton>
      <DropdownMenuRoot v-if="saved || floating">
        <Tip :label="ai.chatActions">
          <DropdownMenuTrigger
            :class="triggerClass"
            :aria-label="ai.chatActions"
            :disabled="disabled"
          >
            <icon-lucide-ellipsis :class="styles.icon()" />
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuPortal>
          <DropdownMenuContent
            align="end"
            :side="floating ? 'top' : 'bottom'"
            :side-offset="6"
            :class="menu.content"
            @close-auto-focus="closeMenu"
          >
            <MenuScrollArea>
              <DropdownMenuItem
                v-if="floating"
                :class="item"
                @select="focusHistoryAfterMenu = true"
              >
                <icon-lucide-history class="size-4" />
                {{ ai.chatHistory }}
              </DropdownMenuItem>
              <template v-if="saved">
                <DropdownMenuSeparator v-if="floating" class="my-1 border-t border-border" />
                <DropdownMenuItem :class="item" @select="rename">{{
                  ai.renameChat
                }}</DropdownMenuItem>
                <DropdownMenuItem
                  :class="item"
                  @select="selectedId && emit('saveTrace', selectedId)"
                  >{{ ai.saveChatTrace }}</DropdownMenuItem
                >
                <DropdownMenuItem :class="item" @select="confirmDelete">{{
                  ai.deleteChat
                }}</DropdownMenuItem>
              </template>
            </MenuScrollArea>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
    <form
      v-if="editing"
      :class="styles.form()"
      @submit.prevent="save"
      @keydown.esc.stop="editing = false"
    >
      <input ref="titleInput" v-model="title" :aria-label="ai.chatTitle" :class="styles.input()" />
      <div :class="styles.actions()">
        <AppButton size="xs" @click="editing = false">{{ ai.cancelChatAction }}</AppButton
        ><AppButton size="xs" type="submit" :disabled="disabled || !title.trim()">{{
          ai.saveChatTitle
        }}</AppButton>
      </div>
    </form>
    <AppConfirmationDialog
      v-model:open="confirming"
      :heading="ai.deleteChatConfirmation"
      :description="ai.deleteChatDescription({ title: selected?.title ?? '' })"
      :cancel-label="ai.cancelChatAction"
      :confirm-label="ai.deleteChat"
      tone="danger"
      :confirm-disabled="disabled"
      @confirm="remove"
    />
  </div>
</template>
