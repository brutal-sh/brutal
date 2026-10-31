<script setup lang="ts">
import { basename, dirname } from 'pathe'
import { computed, onScopeDispose, useId, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import {
  snapshotExport,
  snapshotExportBusy,
  snapshotExportOpen,
  saveSnapshotExport
} from '@/app/document/export/snapshot'
import { useEditorStore } from '@/app/editor/active-store'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import { useHeldContent } from '@/components/ui/overlay/held'

const { files, common, menu } = useI18n()
const descriptionId = useId()
const store = useEditorStore()
onScopeDispose(() => {
  snapshotExportOpen.value = false
  snapshotExport.value = null
})
watch(snapshotExportOpen, (open) => {
  if (!open) snapshotExport.value = null
})
watch(
  () => store.graph,
  () => {
    snapshotExportOpen.value = false
  }
)
const groups = useHeldContent(
  computed(() =>
    [
      { kind: 'images', label: files.value.snapshotImages },
      { kind: 'shaders', label: files.value.snapshotShaders }
    ]
      .map((group) => ({
        ...group,
        assets:
          snapshotExport.value?.file.assets
            ?.filter((asset) => asset.path.startsWith(`${group.kind}/`))
            .map((asset) => ({
              path: asset.path,
              source: snapshotExport.value?.sources.get(asset.path) ?? asset.path
            })) ?? []
      }))
      .filter((group) => group.assets.length)
  ),
  snapshotExportOpen
)
</script>

<template>
  <AppDialog
    v-model:open="snapshotExportOpen"
    :heading="files.snapshotTitle"
    :aria-describedby="descriptionId"
    :close-label="common.close"
    size="md"
    :ui="{
      overlay: 'bg-black/60',
      content: 'w-[min(520px,94vw)] rounded-[10px] border border-dialog-border bg-dialog-surface',
      header: 'border-b-0 px-4 pt-[15px] pb-0',
      title: 'text-base leading-6',
      body: 'px-4 pt-1.5 pb-0',
      footer: 'gap-4 border-t-0 px-4 pt-7 pb-[15px]'
    }"
  >
    <p :id="descriptionId" class="text-xs leading-4 text-muted">{{ files.snapshotDescription }}</p>
    <div v-if="groups.length" class="mt-6 space-y-2">
      <h3 class="text-xxs font-medium uppercase tracking-wide text-muted">
        {{ files.snapshotDependencies }}
      </h3>
      <details
        v-for="group in groups"
        :key="group.kind"
        class="group rounded-xl border border-dialog-border"
      >
        <summary
          class="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-[13px] [&::-webkit-details-marker]:hidden"
        >
          <icon-lucide-wand-sparkles
            v-if="group.kind === 'shaders'"
            class="size-3.5 text-muted"
            aria-hidden="true"
          />
          <icon-lucide-image v-else class="size-3.5 text-muted" aria-hidden="true" />
          <span class="flex-1">{{ group.label({ count: String(group.assets.length) }) }}</span>
          <icon-lucide-chevron-down
            class="size-3 text-muted group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <ul class="space-y-2 border-t border-dialog-border px-3 py-2 text-xxs text-muted">
          <li v-for="asset in group.assets" :key="asset.path" class="break-all">
            <div class="text-surface">{{ basename(asset.source) }}</div>
            <div v-if="dirname(asset.source) !== '.'">{{ dirname(asset.source) }}</div>
          </li>
        </ul>
      </details>
    </div>
    <template #footer>
      <AppButton
        size="md"
        variant="outline"
        class="rounded-lg bg-panel-secondary px-4 text-[13px]"
        :disabled="snapshotExportBusy"
        @click="snapshotExportOpen = false"
        >{{ common.cancel }}</AppButton
      >
      <AppButton
        variant="solid"
        size="md"
        class="rounded-lg bg-white px-4 text-[13px] text-black hover:bg-white/90"
        :loading="snapshotExportBusy"
        @click="saveSnapshotExport"
        >{{ menu.exportSnapshot.replace('…', '') }}</AppButton
      >
    </template>
  </AppDialog>
</template>
