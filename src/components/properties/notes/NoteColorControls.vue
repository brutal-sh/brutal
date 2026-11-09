<script setup lang="ts">
import { isEqual } from 'es-toolkit'
import { tv } from 'tailwind-variants'
import { computed, ref, useId } from 'vue'

import { colorToCSS, parseColor, tryParseColor } from '@open-pencil/scene-graph/color'
import { NOTE_COLORS } from '@open-pencil/scene-graph/generated'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useNoteMessages, usePanelMessages } from '@open-pencil/vue/i18n'
import { ColorInputRoot } from '@open-pencil/vue/primitives/ColorPicker'

import ColorPicker from '@/components/ColorPicker/ColorPicker.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import theme from '@/theme/notes'

const {
  color,
  mixed = false,
  disabled = false
} = defineProps<{
  color: Color
  mixed?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{
  select: [color: Color]
  preview: [color: Color]
  openChange: [open: boolean]
  cancel: []
}>()
const messages = useNoteMessages()
const panels = usePanelMessages()
const styles = tv(theme)()
const inputId = useId()
const draft = ref<string | null>(null)
const presets = Object.entries(NOTE_COLORS).map(([name, hex]) => ({
  name: name as keyof typeof NOTE_COLORS,
  hex,
  color: parseColor(hex)
}))
const swatchStyle = computed(() => ({
  background: mixed ? undefined : colorToCSS({ ...color, a: 1 })
}))
function commitHex(update: (hex: string) => Color, hex: string) {
  const value = (draft.value ?? hex).trim()
  if (tryParseColor(value.startsWith('#') ? value : `#${value}`)) emit('select', update(value))
  draft.value = null
}
</script>

<template>
  <div :class="styles.palette()">
    <Tip v-for="preset in presets" :key="preset.name" :label="messages[preset.name]" as-child>
      <button
        type="button"
        :class="styles.preset()"
        :aria-label="messages[preset.name]"
        :aria-pressed="!mixed && isEqual(color, preset.color)"
        :data-selected="!mixed && isEqual(color, preset.color)"
        :disabled="disabled"
        @click="emit('select', preset.color)"
      >
        <span :class="styles.swatch()" :style="{ background: preset.hex }" />
      </button>
    </Tip>
  </div>
  <ColorInputRoot :color="color" editable>
    <template #default="{ hex, actions }">
      <div :class="styles.colorRow()">
        <label :for="inputId" :class="styles.colorLabel()">{{ messages.color }}</label>
        <div :class="styles.colorField()">
          <ColorPicker
            v-if="!disabled"
            :color="color"
            compact
            :show-alpha="false"
            :mixed="mixed"
            @update="emit('preview', $event)"
            @open-change="emit('openChange', $event)"
            @cancel="emit('cancel')"
          >
            <template #trigger>
              <button
                type="button"
                :class="styles.colorTrigger()"
                :style="swatchStyle"
                :aria-label="panels.editColor"
              >
                <icon-lucide-minus v-if="mixed" class="size-3" aria-hidden="true" />
              </button>
            </template>
          </ColorPicker>
          <button
            v-else
            type="button"
            :class="styles.colorTrigger()"
            :style="swatchStyle"
            :aria-label="panels.editColor"
            disabled
          />
          <AppInput
            :id="inputId"
            :model-value="draft ?? (mixed ? '' : hex)"
            :aria-label="messages.colorHex"
            :placeholder="mixed ? panels.mixed : undefined"
            :disabled="disabled"
            :class="styles.hex()"
            maxlength="6"
            @update:model-value="draft = String($event)"
            @change="commitHex(actions.updateFromHex, hex)"
            @blur="draft = null"
            @keydown.esc.stop="draft = null"
          />
        </div>
      </div>
    </template>
  </ColorInputRoot>
</template>
