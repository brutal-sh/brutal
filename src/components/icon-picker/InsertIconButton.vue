<script setup lang="ts">
import IconSmilePlus from '~icons/lucide/smile-plus'

import { usePanelMessages } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import ToolButton from '@/components/toolbar/ToolButton.vue'
import type { ToolbarUI } from '@/components/toolbar/types'

import IconPicker from './IconPicker.vue'

/** The toolbar's icon picker, also opened by the Insert Icon command. */
const {
  ui,
  mobile = false,
  showTrigger = true
} = defineProps<{ ui?: ToolbarUI; mobile?: boolean; showTrigger?: boolean }>()
const store = useEditorStore()
const panels = usePanelMessages()

function insert(name: string) {
  store.insertIcon(name).catch(() => toast.error(panels.value.insertIconFailed))
}
</script>

<template>
  <IconPicker
    v-model:open="store.state.iconPickerOpen"
    :heading="panels.insertIcon"
    :tooltip="panels.insertIcon"
    side="top"
    align="center"
    @select="insert"
  >
    <template v-if="showTrigger" #trigger>
      <ToolButton
        :icon="IconSmilePlus"
        :label="panels.insertIcon"
        :active="store.state.iconPickerOpen"
        :mobile="mobile"
        :ui="ui"
      />
    </template>
    <template v-else #anchor
      ><span aria-hidden="true" class="pointer-events-none absolute top-24 left-12 size-px"
    /></template>
  </IconPicker>
</template>
