<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { onMounted, ref } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { useLibraryService } from '@/app/libraries'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import LibraryManagerDialog from '@/components/libraries/LibraryManagerDialog.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import workspaceTheme from '@/theme/home/workspace'

const { query, view } = defineProps<{ query: string; view: 'grid' | 'list' }>()
const editor = useEditorStore()
const service = useLibraryService()
const open = ref(false)
const error = ref('')
const styles = tv(workspaceTheme)()
onMounted(async () => {
  try {
    await service.refresh(editor)
  } catch (reason) {
    error.value = String(reason)
  }
})
</script>
<template>
  <section aria-label="Design Systems">
    <AppAlert
      v-if="error"
      tone="error"
      heading="Could not load design systems"
      :description="error"
    />
    <div class="mb-4 flex justify-end">
      <AppButton variant="outline" @click="open = true">Manage libraries</AppButton>
    </div>
    <AppPlaceholder
      v-if="!service.summaries.value.length"
      label="No design systems yet"
      description="Publish a component library from a design to see it here."
    />
    <div v-else :class="view === 'grid' ? styles.grid() : styles.list()">
      <DocumentEntry
        v-for="library in service.summaries.value.filter((item) =>
          item.name.toLocaleLowerCase().includes(query)
        )"
        :key="library.libraryId"
        :view="view"
        :name="library.name"
        :metadata="`${library.assetCount} components`"
        @open="open = true"
      />
    </div>
    <LibraryManagerDialog v-model="open" />
  </section>
</template>
