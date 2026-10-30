<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { ref, watch } from 'vue'

import type { RecoverySnapshotMeta } from '@/app/document/recovery'
import { useDateFormat } from '@/app/i18n/date'
import { activeTab, listRecoverySnapshots, restoreRecoverySnapshot } from '@/app/tabs'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import workspaceTheme from '@/theme/home/workspace'

const { query, view } = defineProps<{ query: string; view: 'grid' | 'list' }>()
const drafts = ref<RecoverySnapshotMeta[]>([])
const loading = ref(true)
const error = ref('')
const styles = tv(workspaceTheme)()
const dates = useDateFormat()
watch(
  () => activeTab.value?.kind === 'home',
  async (active, _previous, onCleanup) => {
    if (!active) return
    let current = true
    onCleanup(() => {
      current = false
    })
    loading.value = true
    error.value = ''
    try {
      const snapshots = await listRecoverySnapshots()
      if (current) drafts.value = snapshots
    } catch (reason) {
      if (current) error.value = String(reason)
    } finally {
      if (current) loading.value = false
    }
  },
  { immediate: true }
)
async function restore(id: string) {
  try {
    await restoreRecoverySnapshot(id)
  } catch (reason) {
    error.value = String(reason)
  }
}
</script>
<template>
  <section aria-label="Drafts">
    <AppAlert v-if="error" tone="error" heading="Could not open drafts" :description="error" />
    <AppPlaceholder v-else-if="loading" label="Loading drafts…" />
    <AppPlaceholder
      v-else-if="!drafts.length"
      label="No drafts yet"
      description="Your locally recovered designs appear here."
    />
    <div v-else :class="view === 'grid' ? styles.grid() : styles.list()">
      <DocumentEntry
        v-for="draft in drafts.filter((item) =>
          item.documentName.toLocaleLowerCase().includes(query)
        )"
        :key="draft.id"
        :view="view"
        :name="draft.documentName"
        :metadata="dates.format(draft.updatedAt, 'dateTime')"
        @open="restore(draft.id)"
      />
    </div>
  </section>
</template>
