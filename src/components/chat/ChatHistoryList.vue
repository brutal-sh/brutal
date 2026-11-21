<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useAIMessages } from '@open-pencil/vue/i18n'

import historyTheme from '@/theme/chat/history'

const chatHistoryTheme = tv(historyTheme)

const { conversations, selectedId, disabled, inline } = defineProps<{
  conversations: { id: string; title: string; documentName: string; available: boolean }[]
  selectedId?: string
  disabled?: boolean
  inline?: boolean
}>()
const emit = defineEmits<{ select: [id: string] }>()
const ai = useAIMessages()
const styles = computed(() => chatHistoryTheme({ inline }))
const all = defineModel<boolean>('all', { default: false })
const query = defineModel<string>('query', { default: '' })
const results = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  return conversations.filter(
    (chat) =>
      (all.value || chat.available) &&
      `${chat.title} ${chat.documentName}`.toLocaleLowerCase().includes(search)
  )
})
</script>

<template>
  <div :class="styles.browser()">
    <input
      v-model="query"
      :aria-label="ai.searchChats"
      :placeholder="ai.searchChats"
      :class="styles.input()"
    />
    <div :class="styles.scope()" role="group" :aria-label="ai.chatScope">
      <button
        :class="styles.scopeButton()"
        :data-active="!all"
        :aria-pressed="!all"
        @click="all = false"
      >
        {{ ai.thisDocument }}
      </button>
      <button
        :class="styles.scopeButton()"
        :data-active="all"
        :aria-pressed="all"
        @click="all = true"
      >
        {{ ai.allDocuments }}
      </button>
    </div>
    <div :class="styles.list()">
      <button
        v-for="chat in results"
        :key="chat.id"
        :class="styles.row()"
        :data-selected="chat.id === selectedId"
        :aria-current="chat.id === selectedId ? 'true' : undefined"
        :disabled="disabled"
        @click="emit('select', chat.id)"
      >
        <span :class="styles.title()"
          ><span :class="styles.label()">{{ chat.title || ai.newChat }}</span
          ><span v-if="all" :class="styles.detail()">{{ chat.documentName }}</span></span
        >
        <icon-lucide-check v-if="chat.id === selectedId" :class="styles.icon()" />
      </button>
      <p v-if="!disabled && !results.length" :class="styles.empty()">{{ ai.noChatsFound }}</p>
    </div>
  </div>
</template>
