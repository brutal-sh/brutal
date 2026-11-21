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
  DropdownMenuItem
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, nextTick, ref, watch } from 'vue'

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
  docked = false
} = defineProps<{
  conversations: { id: string; title: string; documentName: string; available: boolean }[]
  selectedId?: string
  disabled?: boolean
  saved?: boolean
  docked?: boolean
}>()
const emit = defineEmits<{
  select: [id: string]
  create: []
  rename: [id: string, title: string]
  saveTrace: [id: string]
  delete: [id: string]
}>()
const { ai } = useI18n()
const triggerClass = tv(iconButtonTheme)({ size: 'sm' })
const styles = computed(() => chatHistoryTheme({ docked }))
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
const selected = computed(() => conversations.find((chat) => chat.id === selectedId))
watch(
  () => selectedId,
  () => {
    editing.value = false
    confirming.value = false
  }
)
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
  if (editing.value) event.preventDefault()
}
</script>

<template>
  <div :class="styles.root()">
    <div :class="styles.header()">
      <PopoverRoot v-model:open="open">
        <PopoverTrigger :class="styles.trigger()" :disabled="disabled" :aria-label="ai.chatHistory">
          <span :class="styles.title()">{{ selected?.title || ai.newChat }}</span>
          <icon-lucide-chevron-down :class="styles.icon()" />
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
      <slot name="actions" />
      <AppButton
        v-if="docked"
        size="md"
        variant="outline"
        :ui="{ base: styles.create() }"
        :aria-label="ai.newChat"
        :disabled="disabled"
        @click="emit('create')"
      >
        <template #leading><icon-lucide-plus /></template>
        New
      </AppButton>
      <IconButton v-else :label="ai.newChat" :disabled="disabled" size="sm" @click="emit('create')"
        ><icon-lucide-plus :class="styles.icon()"
      /></IconButton>
      <DropdownMenuRoot v-if="saved">
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
            :side-offset="6"
            :class="menu.content"
            @close-auto-focus="closeMenu"
          >
            <MenuScrollArea>
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
