<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from 'vue'

import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'
import { openPublishLibraryDialog, useLibraryService } from '@/app/libraries'
import LibraryManagerDialog from '@/components/libraries/LibraryManagerDialog.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'

const editor = useEditorStore()
const service = useLibraryService()
const manageOpen = ref(false)
const loading = ref(false)
const error = ref('')
const bindingsRevision = ref(0)
onScopeDispose(
  editor.onEditorEvent('document:libraries-changed', () => {
    bindingsRevision.value++
  })
)
const enabled = useSceneComputed(() => {
  void bindingsRevision.value
  return new Set(
    [...editor.graph.enabledLibraries.values()]
      .filter((item) => item.enabled)
      .map((item) => item.libraryId)
  )
})
async function refresh() {
  try {
    await service.refresh(editor)
  } catch {
    error.value = 'Could not load libraries. Try again.'
  }
}
async function toggle(id: string) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    if (enabled.value.has(id)) await service.disable(editor, id)
    else await service.enable(editor, id)
    await refresh()
  } catch {
    error.value = 'Could not update this library. Try again.'
  } finally {
    loading.value = false
  }
}
onMounted(refresh)
</script>
<template>
  <section aria-label="Libraries" class="flex min-h-0 flex-1 flex-col">
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <AppAlert v-if="error" tone="error" heading="Library unavailable" :description="error" />
      <div class="mb-5 flex items-center justify-between">
        <p class="text-xs font-semibold text-muted">
          {{ enabled.size ? `${enabled.size} imported libraries` : 'No imported libraries' }}
        </p>
        <IconButton label="Manage libraries" @click="manageOpen = true"
          ><icon-lucide-plus class="size-4"
        /></IconButton>
      </div>
      <h2 class="mb-2 text-xs font-semibold text-muted">Available libraries</h2>
      <p v-if="!service.summaries.value.length" class="text-xs text-muted">
        Publish a library or add a library through Manage libraries.
      </p>
      <div
        v-for="library in service.summaries.value"
        :key="library.libraryId"
        class="mb-3 rounded-lg border border-border p-3"
      >
        <icon-lucide-library class="mb-3 size-8 text-component" />
        <h3 class="text-sm text-surface">{{ library.name }}</h3>
        <p class="mb-3 text-xs text-muted">{{ library.assetCount }} components</p>
        <AppButton variant="outline" :disabled="loading" @click="toggle(library.libraryId)">{{
          enabled.has(library.libraryId) ? 'Remove library' : 'Add library'
        }}</AppButton>
      </div>
    </div>
    <footer class="shrink-0 border-t border-border p-2">
      <AppButton class="w-full" @click="openPublishLibraryDialog"
        >Turn this file into a library</AppButton
      >
    </footer>
    <LibraryManagerDialog v-model="manageOpen" />
  </section>
</template>
