<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import { exportSelectUI } from '@/theme/properties/export-select'

const store = useEditorStore()
const { panels } = useI18n()
const formats = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPEG' },
  { value: 'webp', label: 'WEBP' },
  { value: 'pdf', label: 'PDF' },
  { value: 'svg', label: 'SVG' }
]
const scales = [1, 2, 3].map((value) => ({ value, label: `${value}x` }))
const savedFormat = useLocalStorage('open-pen:export-format', 'png')
const savedScale = useLocalStorage('open-pen:export-scale', 1)
const format = computed({
  get: () => formats.find((option) => option.value === savedFormat.value)?.value ?? 'png',
  set: (value) => {
    if (value === 'pdf' || savedFormat.value === 'pdf') savedScale.value = 1
    savedFormat.value = value
  }
})
const scale = computed({
  get: () => scales.find((option) => option.value === savedScale.value)?.value ?? 1,
  set: (value) => {
    savedScale.value = value
  }
})
const busy = ref(false)
const failed = ref(false)

async function output() {
  if (busy.value) return
  busy.value = true
  failed.value = false
  const ids = [...store.state.selectedIds]
  try {
    if (format.value === 'pdf') {
      await store.exportTarget({ scope: 'selection', nodeIds: ids }, 'pdf', { pdfMode: 'frames' })
    } else {
      await store.exportTargets(
        ids.map((nodeId) => ({
          target: { scope: 'node', nodeId },
          formatId: format.value,
          options: { scale: scale.value }
        }))
      )
    }
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PanelSection :label="panels.export">
    <div class="grid grid-cols-2 gap-1.5">
      <AppSelect
        :model-value="format === 'pdf' ? 1 : scale"
        :options="scales"
        :ui="exportSelectUI"
        :label="panels.exportScale"
        :disabled="format === 'pdf'"
        @update:model-value="scale = $event"
      />
      <AppSelect
        v-model="format"
        :options="formats"
        :ui="exportSelectUI"
        :label="panels.exportFormat"
      />
    </div>
    <p v-if="format === 'pdf'" class="mt-2 text-[11px] text-muted">{{ panels.exportPDFPages }}</p>
    <AppButton
      class="mt-1.5 h-6 w-full bg-input text-[11px] font-normal text-surface"
      :disabled="busy || !store.state.selectedIds.size"
      @click="output"
    >
      {{
        store.state.selectedIds.size > 1
          ? panels.exportLayers({ count: store.state.selectedIds.size })
          : panels.exportLayer
      }}
    </AppButton>
    <AppAlert v-if="failed" :heading="panels.exportFailed" tone="error" class="mt-2" />
  </PanelSection>
</template>
