<script setup lang="ts">
import { useNoteMessages } from '@open-pencil/vue/i18n'

import PanelSection from '@/components/ui/panel/PanelSection.vue'

import NoteColorControls from './NoteColorControls.vue'
import { useNoteColor } from './useNoteColor'

const { ids } = defineProps<{ ids: readonly string[] }>()
const messages = useNoteMessages()
const { color, mixed, disabled, setColor, updatePreview, openChanged, cancel } = useNoteColor(ids)
</script>

<template>
  <PanelSection :label="messages.title">
    <NoteColorControls
      :color="color"
      :mixed="mixed"
      :disabled="disabled"
      @select="setColor"
      @preview="updatePreview"
      @open-change="openChanged"
      @cancel="cancel"
    />
  </PanelSection>
</template>
