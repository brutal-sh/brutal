<script setup lang="ts">
import { tv } from 'tailwind-variants'

import { useNoteMessages, usePanelMessages } from '@open-pencil/vue/i18n'
import { LayoutControlsRoot } from '@open-pencil/vue/primitives/LayoutControls'
import { PositionControlsRoot } from '@open-pencil/vue/primitives/PositionControls'

import { useEditorStore } from '@/app/editor/active-store'
import NumberField from '@/components/inputs/NumberField.vue'
import SizeControls from '@/components/properties/layout/size/SizeControls.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import theme from '@/theme/notes'

const { multiple } = defineProps<{ multiple: boolean }>()
const panels = usePanelMessages()
const messages = useNoteMessages()
const store = useEditorStore()
const styles = tv(theme)()
</script>

<template>
  <PanelSection :label="panels.layout">
    <template v-if="!multiple" #actions>
      <IconButton :label="messages.addFlexLayout" size="xs" @click="store.wrapNoteInAutoLayout()">
        <icon-lucide-layout-panel-top class="size-3.5" />
      </IconButton>
    </template>
    <div :class="styles.dimensions()">{{ messages.dimensions }}</div>
    <PositionControlsRoot v-if="multiple" v-slot="{ wValue, hValue, actions }">
      <PanelGrid :columns="2">
        <NumberField
          :model-value="wValue"
          :aria-label="panels.width"
          icon="W"
          :min="1"
          @update:model-value="actions.updateProp('width', $event)"
          @commit="(value, previous) => actions.commitProp('width', value, previous)"
          @cancel="actions.cancelProp('width')"
        />
        <NumberField
          :model-value="hValue"
          :aria-label="panels.height"
          icon="H"
          :min="1"
          @update:model-value="actions.updateProp('height', $event)"
          @commit="(value, previous) => actions.commitProp('height', value, previous)"
          @cancel="actions.cancelProp('height')"
        />
      </PanelGrid>
    </PositionControlsRoot>
    <LayoutControlsRoot v-else><SizeControls compact /></LayoutControlsRoot>
  </PanelSection>
</template>
