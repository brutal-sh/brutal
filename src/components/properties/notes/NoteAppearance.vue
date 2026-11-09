<script setup lang="ts">
import { usePanelMessages } from '@open-pencil/vue/i18n'
import { AppearanceControlsRoot } from '@open-pencil/vue/primitives/AppearanceControls'

import { OpacityIcon } from '@/components/icons/paint'
import NumberField from '@/components/inputs/NumberField.vue'
import VariableNumberField from '@/components/properties/VariableNumberField.vue'
import VisibilityControl from '@/components/properties/visibility/VisibilityControl.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

const panels = usePanelMessages()
</script>

<template>
  <AppearanceControlsRoot v-slot="{ node, isMulti, opacityPercent, visibilityState, actions }">
    <PanelSection :label="panels.appearance">
      <template #actions>
        <VisibilityControl
          :node-id="node && !isMulti ? node.id : undefined"
          :visibility="visibilityState"
          @toggle="actions.toggleVisibility"
        />
      </template>
      <PanelGrid :columns="2">
        <VariableNumberField
          v-if="node && !isMulti"
          :node-id="node.id"
          binding-path="opacity"
          :model-value="opacityPercent"
          :aria-label="panels.opacity"
          :min="0"
          :max="100"
          compact
          @update:model-value="actions.updateProp('opacity', $event / 100)"
          @commit="(value, previous) => actions.commitProp('opacity', value / 100, previous / 100)"
          ><template #icon><OpacityIcon class="size-4" /></template
        ></VariableNumberField>
        <NumberField
          v-else
          :model-value="opacityPercent"
          :aria-label="panels.opacity"
          :min="0"
          :max="100"
          @update:model-value="actions.updateProp('opacity', $event / 100)"
          @commit="(value, previous) => actions.commitProp('opacity', value / 100, previous / 100)"
          ><template #icon><OpacityIcon class="size-4" /></template
        ></NumberField>
        <NumberField :model-value="0" :aria-label="panels.radius" disabled>
          <template #icon><icon-lucide-scan class="size-4" /></template>
        </NumberField>
      </PanelGrid>
    </PanelSection>
  </AppearanceControlsRoot>
</template>
