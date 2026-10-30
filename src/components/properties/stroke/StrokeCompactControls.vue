<script setup lang="ts">
import { computed } from 'vue'

import type { Stroke } from '@open-pencil/scene-graph'
import { MIXED } from '@open-pencil/vue/controls/node-props'
import { isStrokeCapValue, useStrokeControls } from '@open-pencil/vue/controls/stroke'
import { useI18n } from '@open-pencil/vue/i18n'

import NumberField from '@/components/inputs/NumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const { sidesOffered, sidesShown } = defineProps<{
  sidesOffered: boolean
  sidesShown: boolean
}>()
const emit = defineEmits<{ toggleSides: [] }>()
const controls = useStrokeControls()
const { cap, join } = controls
const { panels } = useI18n()
const align = computed(() => {
  const value = controls.currentAlign()
  return value === MIXED ? '' : value
})
const joins = computed(() => [
  { value: 'MITER', label: panels.value.strokeMiterShort },
  { value: 'ROUND', label: panels.value.strokeRoundShort },
  { value: 'BEVEL', label: panels.value.strokeBevelShort }
])
const caps = computed(() => [
  { value: 'NONE', label: panels.value.none },
  { value: 'ROUND', label: panels.value.strokeRoundShort },
  { value: 'SQUARE', label: panels.value.strokeSquareShort }
])
const geometryUI = {
  trigger: 'justify-center',
  value: 'sr-only',
  chevron: 'ml-auto'
}
function setJoin(value: string) {
  if (value === 'MITER' || value === 'ROUND' || value === 'BEVEL') controls.setJoin(value)
}
function setCap(value: string) {
  if (isStrokeCapValue(value)) controls.setCap(value)
}
</script>

<template>
  <div class="mt-2 flex flex-col gap-2">
    <PanelGrid
      :columns="2"
      class="[&>[data-slot=actions]]:min-w-5 [&>[data-slot=actions]_[data-slot=icon-button]]:size-5"
    >
      <PanelFieldGroup :label="panels.position">
        <AppSelect
          :label="panels.strokeType"
          :model-value="align"
          :placeholder="panels.mixed"
          :options="controls.alignOptions"
          data-property="stroke-align"
          @update:model-value="controls.updateAlign($event as Stroke['align'])"
        />
      </PanelFieldGroup>
      <PanelFieldGroup :label="panels.strokeWeightShort">
        <NumberField
          icon="W"
          :aria-label="panels.strokeWeight"
          :aria-valuetext="controls.weight.value === MIXED ? panels.mixed : undefined"
          :model-value="controls.weight.value"
          :min="0"
          data-property="stroke-weight"
          @update:model-value="controls.updateWeight"
          @commit="controls.commitWeight"
        />
      </PanelFieldGroup>
      <template v-if="sidesOffered" #actions>
        <IconButton
          :label="panels.strokeSides"
          :active="sidesShown"
          class="size-5 self-end"
          data-property="stroke-sides"
          @click="emit('toggleSides')"
        >
          <icon-lucide-square class="size-3.5" />
        </IconButton>
      </template>
    </PanelGrid>
    <div v-if="sidesShown" class="pr-[26px]"><slot name="sides" /></div>
    <PanelGrid :columns="2" :data-sides="sidesOffered || undefined" class="data-[sides]:pr-[26px]">
      <PanelFieldGroup :label="panels.strokeJoinShort">
        <AppSelect
          :model-value="join === MIXED ? '' : join"
          :options="joins"
          :label="panels.strokeJoin"
          :placeholder="panels.mixed"
          :ui="geometryUI"
          data-property="stroke-join"
          @update:model-value="setJoin"
        >
          <template #leading>
            <icon-lucide-corner-up-right v-if="join === 'MITER'" class="size-4" />
            <icon-lucide-circle v-else-if="join === 'ROUND'" class="size-4" />
            <icon-lucide-triangle v-else class="size-4" />
          </template>
        </AppSelect>
      </PanelFieldGroup>
      <PanelFieldGroup :label="panels.strokeCapShort">
        <AppSelect
          :model-value="cap === MIXED ? '' : cap"
          :options="caps"
          :label="panels.strokeCap"
          :placeholder="panels.mixed"
          :ui="geometryUI"
          data-property="stroke-cap"
          @update:model-value="setCap"
        >
          <template #leading>
            <icon-lucide-circle v-if="cap === 'ROUND'" class="size-4" />
            <icon-lucide-square v-else-if="cap === 'SQUARE'" class="size-4" />
            <icon-lucide-minus v-else class="size-4" />
          </template>
        </AppSelect>
      </PanelFieldGroup>
    </PanelGrid>
  </div>
</template>
