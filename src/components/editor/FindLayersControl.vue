<script setup lang="ts">
import {
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  ToolbarButton
} from 'reka-ui'
import { ref, useTemplateRef } from 'vue'

import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'
import { findLayers } from '@/app/editor/selection/search'
import IconButton from '@/components/ui/button/IconButton.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'

const { anchor } = defineProps<{ anchor: HTMLElement | null }>()
const store = useEditorStore()
const open = ref(false)
const query = ref('')
const input = useTemplateRef<HTMLInputElement>('input')
const results = useSceneComputed(() =>
  findLayers(store.graph, store.state.currentPageId, query.value)
)
const styles = usePopoverUI({
  content: 'w-70 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl'
})
const reference = {
  getBoundingClientRect() {
    const bounds = anchor?.getBoundingClientRect()
    return new DOMRect(bounds?.x ?? 0, bounds?.y ?? 0, bounds?.width ?? 0, 48)
  }
}

function select(id: string) {
  if (!store.graph.getNode(id)) return
  store.select([id])
  store.zoomToSelection()
}

function focusInput(event: Event) {
  event.preventDefault()
  input.value?.focus()
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverAnchor :reference="reference" class="hidden" />
    <PopoverTrigger as-child>
      <ToolbarButton as-child>
        <IconButton label="Find layers" size="md" class="size-7"
          ><icon-lucide-search class="size-4"
        /></IconButton>
      </ToolbarButton>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        aria-label="Find layers"
        side="bottom"
        align="end"
        :side-offset="8"
        :class="styles.content"
        @open-auto-focus="focusInput"
      >
        <form
          class="flex h-11 items-center gap-2 border-b border-border px-3"
          @submit.prevent="results[0] && select(results[0].id)"
        >
          <icon-lucide-search class="size-4 shrink-0 text-muted" />
          <input
            ref="input"
            v-model="query"
            aria-label="Find layers"
            placeholder="Find layers"
            class="min-w-0 flex-1 bg-transparent text-sm text-surface outline-none"
          />
          <IconButton label="Close layer search" @click="open = false"
            ><icon-lucide-x class="size-4"
          /></IconButton>
        </form>
        <p v-if="!query.trim()" class="px-4 py-6 text-center text-xs text-muted">
          Searches names, text, and IDs
        </p>
        <p
          v-else-if="!results.length"
          role="status"
          class="px-4 py-6 text-center text-xs text-muted"
        >
          No layers found
        </p>
        <div v-else class="max-h-80 overflow-y-auto p-1" aria-label="Matching layers">
          <button
            v-for="node in results"
            :key="node.id"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-surface hover:bg-hover focus-visible:outline-panel-focus"
            @click="select(node.id)"
          >
            <icon-lucide-layers class="size-3.5 shrink-0 text-muted" />
            <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>
          </button>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
