<script setup lang="ts">
import { ref } from 'vue'

import { useRetainedActivity } from '@open-pencil/vue/lifecycle/retention'

import { galleryScripts, type GalleryScript } from '@/app/document/scripts/gallery/catalog'
import { insertGalleryScript } from '@/app/document/scripts/gallery/insert'
import { useEditorStore } from '@/app/editor/active-store'
import { AppDialogRoot, AppDialogHeader, AppDialogBody } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'

const open = defineModel<boolean>('open', { default: false })
const store = useEditorStore()
const error = ref('')
const retained = useRetainedActivity()
function insert(script: GalleryScript) {
  if (retained?.value === false) return
  try {
    insertGalleryScript(store, script)
    error.value = ''
    open.value = false
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : String(failure)
  }
}
</script>

<template>
  <AppDialogRoot
    v-model:open="open"
    size="screen"
    :ui="{
      content:
        'w-[calc(100vw-32px)] h-[min(800px,86vh)] max-h-[86vh] border border-dialog-border rounded-lg bg-dialog-surface'
    }"
  >
    <AppDialogHeader
      heading="Goodies"
      close-label="Close"
      :ui="{
        header: 'relative h-14 items-center border-dialog-border px-4 py-2',
        title: 'text-lg',
        close: 'size-6'
      }"
    >
      <template #actions>
        <span class="absolute left-1/2 -translate-x-1/2 rounded-lg bg-panel p-1">
          <span class="block rounded-md bg-dialog-surface px-3 py-1.5 text-xs text-surface"
            >Scripts</span
          >
        </span>
      </template>
    </AppDialogHeader>
    <AppDialogBody :ui="{ body: '@container/goodies px-4 py-2.5' }">
      <AppAlert v-if="error" tone="error" heading="Could not insert Script" :description="error" />
      <div
        class="mx-auto grid max-w-[1248px] grid-cols-1 gap-6 @xl/goodies:grid-cols-2 @4xl/goodies:grid-cols-3"
      >
        <button
          v-for="script in galleryScripts"
          :key="script.id"
          type="button"
          :aria-label="`Insert to Canvas: ${script.name}`"
          :disabled="store.state.readOnly"
          class="group min-w-0 cursor-pointer rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-panel-focus disabled:cursor-not-allowed disabled:opacity-60"
          @click="insert(script)"
        >
          <span
            class="relative flex aspect-[5/3] items-center justify-center overflow-hidden rounded-md bg-white text-muted"
          >
            <img :src="script.preview" alt="" class="h-full w-full object-contain" />
            <span
              class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              >Insert to Canvas</span
            >
          </span>
          <span
            class="mt-3.5 flex items-center justify-between gap-2 text-xs font-semibold text-surface"
          >
            {{ script.name }}
            <span class="rounded-full border border-current px-1.5 py-0.5 font-mono">.js</span>
          </span>
        </button>
      </div>
    </AppDialogBody>
  </AppDialogRoot>
</template>
